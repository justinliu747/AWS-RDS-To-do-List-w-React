import { PrismaClient } from "@prisma/client";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

const prisma = new PrismaClient();

const USER_ID = "demo";


export const handler = async () => {

  //prisma.item.findMany() gets all rows from "Item" table in postgresSQL
  //"model Item" in schema
  const items = await prisma.item.findMany({
    //only returns items of userId matching the current user_id
    where: { userId: USER_ID },

    //asc = ascending order (smallest → largest, oldest → newest, false → true)
    //passing multiple by order clauses -> primary sort, secondary sort(only within tasks with same value)
    //multiple order clauses do NOT overwirte each other! just refines wtihin each group
    orderBy: [{ completed: "asc" }, { createdAt: "asc" }],
  });
  //status code 200 = success, sends a stringified list of items back to frontend
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(items) };
};