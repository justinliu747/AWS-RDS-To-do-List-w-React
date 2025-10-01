// gets prisma client lib that was generated when you ran `prisma generate`
import { PrismaClient } from "@prisma/client";

//headers to return
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};
// creates instance of prisma client
// this object (`prisma`) is how we query our database
const prisma = new PrismaClient();

// simulated user (for now, everything belongs to "demo")
// later this could come from auth
const USER_ID = "demo";

//aws lambda handler function
//export allows your gateway to see the handler
//async allows for await in the fucntion
export const handler = async (event: any) => {
  // parse the request body (JSON from the frontend)
  const body = JSON.parse(event.body);

  // prisma.item.create() adds a new row into the "Item" table
  const todo = await prisma.item.create({
    data: {
        //rest is automatically defined by default values
      title: body.title,     // title comes from request
      userId: USER_ID,       // attach to demo user
    },
  });

  // status code 201 = created
  // return the new todo back to frontend
  return { statusCode: 201, headers: CORS_HEADERS, body: JSON.stringify(todo) };
};