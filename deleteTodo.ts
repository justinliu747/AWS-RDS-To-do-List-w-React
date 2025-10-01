import { PrismaClient } from "@prisma/client";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};
const prisma = new PrismaClient();

const USER_ID = "demo";

export const handler = async (event: any) => {
  //get todo id from path parameter (/todos/{id})
  const id = event.pathParameters.id;

  //check if todo exists for this user
  const todo = await prisma.item.findFirst({
    where: { id, userId: USER_ID },
  });

  //if todo not found, return 404
  if (!todo) {
    return { statusCode: 404, body: JSON.stringify({ message: "Not found" }) };
  }

  // delete the todo
  await prisma.item.delete({ where: { id } });

  // status code 204 = success, return nothing
  return { statusCode: 204, headers: CORS_HEADERS, body: "" };
};
