// import { kv } from "@vercel/kv";

// await kv.set("user_1_session", "session_token_value");
// const session = await kv.get("user_1_session");


// // Message structure and protocol flow taken from y-webrtc/bin/server.js
// interface YWebRtcSubscriptionMessage {
//   type: 'subscribe' | 'unsubscribe';
//   topics?: string[];
// }
// interface YWebRtcPingMessage {
//   type: 'ping';
// }
// interface YWebRtcPublishMessage {
//   type: 'publish';
//   topic?: string;
//   [k: string]: any;
// }

// async function subscribe(topic: string, connectionId: string) {
//   try {
//     return await Promise.all([
//       kv.sadd(`topic_${topic}`, connectionId),
//       kv.sadd(`conn_${connectionId}`, topic),
//     ]);
//   } catch (err) {
//     console.log(`Cannot update topic ${topic}: ${err.message}`);
//   }
// }

// async function unsubscribe(topic: string, connectionId: string) {
//   try {
//     return await Promise.all([
//       kv.srem(`topic_${topic}`, connectionId),
//       kv.srem(`conn_${connectionId}`, topic),
//     ]);
//   } catch (err) {
//     console.log(`Cannot update topic ${topic}: ${err.message}`);
//   }
// }

// async function getReceivers(topic: string) {
//   try {
//     return await kv.smembers(topic);
//   } catch (err: any) {
//     console.log(`Cannot get topic ${topic}: ${err.message}`);
//     return [];
//   }
// }

// async function handleYWebRtcMessage(
//   connectionId: string,
//   message:
//     | YWebRtcSubscriptionMessage
//     | YWebRtcPublishMessage
//     | YWebRtcPingMessage,
//   send: (receiver: string, message: any) => Promise<void>,
// ) {
//   const promises = [];

//   if (message && message.type) {
//     switch (message.type) {
//       case 'subscribe':
//         (message.topics || []).forEach(topic => {
//           promises.push(subscribe(topic, connectionId));
//         });
//         break;
//       case 'unsubscribe':
//         (message.topics || []).forEach(topic => {
//           promises.push(unsubscribe(topic, connectionId));
//         });
//         break;
//       case 'publish':
//         if (message.topic) {
//           const receivers = await getReceivers(message.topic);
//           receivers.forEach(receiver => {
//             promises.push(send(receiver, message));
//           });
//         }
//         break;
//       case 'ping':
//         promises.push(send(connectionId, { type: 'pong' }));
//         break;
//     }
//   }

//   await Promise.all(promises);
// }

// function handleConnect(connectionId: string) {
//   // Nothing to do
//   console.log(`Connected: ${connectionId}`);
// }

// async function handleDisconnect(connectionId: string) {
//   console.log(`Disconnected: ${connectionId}`);
//   // Remove the connection from all topics
//   // This is quite expensive, as we need to go through all topics in the table
//   const topics = await kv.smembers(`conn_${connectionId}`);
//   for (const topic of topics) {
//     kv.srem(`topic_${topic}`, connectionId);
//   }
//   kv.del(`conn_${connectionId}`);
// }

// export async function handler(
//   event: HttpV2WebsocketEvent,
// ): Promise<HttpV2Response> {


//   const send = async (connectionId: string, message: any) => {
//     try {
//       await apigwManagementApi
//         .postToConnection({
//           ConnectionId: connectionId,
//           Data: JSON.stringify(message),
//         })
//         .promise();
//     } catch (err) {
//       if (err.statusCode === 410) {
//         console.log(`Found stale connection, deleting ${connectionId}`);
//         await handleDisconnect(connectionId);
//       } else {
//         // Log, but otherwise ignore: There's not much we can do, really.
//         console.log(`Error when sending to ${connectionId}: ${err.message}`);
//       }
//     }
//   };

//   try {
//     switch (event.requestContext.routeKey) {
//       case '$connect':
//         handleConnect(event.requestContext.connectionId);
//         break;
//       case '$disconnect':
//         await handleDisconnect(event.requestContext.connectionId);
//         break;
//       case '$default':
//         await handleYWebRtcMessage(
//           event.requestContext.connectionId,
//           JSON.parse(event.body),
//           send,
//         );
//         break;
//     }

//     return { statusCode: 200 };
//   } catch (err) {
//     console.log(`Error ${event.requestContext.connectionId}`, err);
//     return { statusCode: 500, body: err.message };
//   }
// }