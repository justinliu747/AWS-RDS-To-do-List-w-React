import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //RDS setup, public
    const vpc = new ec2.Vpc(this, 'SimpleVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC },
      ],
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Allow public access to RDS',
    });

    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from anywhere'
    );

    //creates postgres DB
    const db = new rds.DatabaseInstance(this, 'Postgres', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromPassword('postgres', cdk.SecretValue.unsafePlainText('mypassword123')),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [dbSecurityGroup],
      multiAz: false,
      allocatedStorage: 20,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      databaseName: 'todo',
      publiclyAccessible: true,
    });

    const dbHost = db.instanceEndpoint.hostname;

    //prisma layer
    const layerPath = path.join(__dirname, '../../prisma-layer');
    
    // Clean and create layer directory
    if (fs.existsSync(layerPath)) {
      fs.rmSync(layerPath, { recursive: true, force: true });
    }
    fs.mkdirSync(layerPath, { recursive: true });
    fs.mkdirSync(path.join(layerPath, 'nodejs', 'node_modules'), { recursive: true });

    // Copy Prisma from backend
    const backendPath = path.join(__dirname, '../../backend');
    const copyCommand = process.platform === 'win32' 
      ? `xcopy "${path.join(backendPath, 'node_modules', '.prisma')}" "${path.join(layerPath, 'nodejs', 'node_modules', '.prisma')}" /E /I /Y && xcopy "${path.join(backendPath, 'node_modules', '@prisma')}" "${path.join(layerPath, 'nodejs', 'node_modules', '@prisma')}" /E /I /Y`
      : `cp -r ${path.join(backendPath, 'node_modules', '.prisma')} ${path.join(layerPath, 'nodejs', 'node_modules', '.prisma')} && cp -r ${path.join(backendPath, 'node_modules', '@prisma')} ${path.join(layerPath, 'nodejs', 'node_modules', '@prisma')}`;
    
    try {
      execSync(copyCommand, { stdio: 'inherit' });
    } catch (error) {
      console.log('Note: Make sure you run "npm install && npx prisma generate" in the backend folder first!');
      throw error;
    }

    const prismaLayer = new lambda.LayerVersion(this, 'PrismaLayer', {
      code: lambda.Code.fromAsset(layerPath),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Prisma Client with binaries',
    });

    //helper to make Lambda functions
    const makeFn = (name: string, entry: string) =>
      new NodejsFunction(this, name, {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, `../../backend/functions/${entry}`),
        handler: 'handler',
        memorySize: 256,
        timeout: cdk.Duration.seconds(10),
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        securityGroups: [dbSecurityGroup],
        allowPublicSubnet: true,
        layers: [prismaLayer],
        environment: {
          DATABASE_URL: `postgresql://postgres:mypassword123@${dbHost}:5432/todo?schema=public`,
        },
        bundling: {
          externalModules: ['@prisma/client', '.prisma/client', 'aws-sdk'],
        },
      });

    const listTodosFn = makeFn('ListTodosFn', 'listTodo.ts');
    const createTodoFn = makeFn('CreateTodoFn', 'createTodo.ts');
    const toggleTodoFn = makeFn('ToggleTodoFn', 'toggleTodo.ts');
    const deleteTodoFn = makeFn('DeleteTodoFn', 'deleteTodo.ts');

    //API gateway, REST
    const api = new apigw.RestApi(this, 'TodoApi', {
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
    
    //link w api
    const todos = api.root.addResource('todos');
    todos.addMethod('GET', new apigw.LambdaIntegration(listTodosFn));

    const todo = api.root.addResource('todo');
    todo.addMethod('POST', new apigw.LambdaIntegration(createTodoFn));

    const todoId = todo.addResource('{id}');
    todoId.addResource('toggle').addMethod('POST', new apigw.LambdaIntegration(toggleTodoFn));
    todoId.addMethod('DELETE', new apigw.LambdaIntegration(deleteTodoFn));

    //outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url ?? 'N/A' });
    new cdk.CfnOutput(this, 'DatabaseEndpoint', { value: dbHost });
  }
}