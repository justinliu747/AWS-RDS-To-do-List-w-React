import { PrismaClient } from "@prisma/client";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

const prisma = new PrismaClient();

const USER_ID = "demo";

export const handler = async (event: any) => {
  const id = event.pathParameters.id;

  const todo = await prisma.item.findFirst({
    where: { id, userId: USER_ID },
  });

  //if todo not found, return 404
  if (!todo) {
    return { statusCode: 404, body: JSON.stringify({ message: "Not found" }) };
  }

  //toggle the completion state 
  const updated = await prisma.item.update({
    where: { id },
    data: { completed: !todo.completed },
  });

  //return the updated todo
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(updated) };
};
