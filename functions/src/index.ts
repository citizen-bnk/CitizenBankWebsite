
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({origin: true}));

interface Meeting {
  id: string;
  title: string;
  meetingType: string;
  meetingDate: string;
  meetingTime: string;
  location: string;
  virtualLink: string;
  description: string;
}

app.get("/health", (req: express.Request, res: express.Response) => {
  res.status(200).send("OK");
});

app.post(
  "/routes/board-meetings/create",
  async (req: express.Request, res: express.Response) => {
    try {
      const {
        title,
        meetingType,
        meetingDate,
        meetingTime,
        location,
        virtualLink,
        description,
      } = req.body;
      if (!title || !meetingDate || !meetingTime) {
        return res.status(400).send("Missing required fields");
      }
      const meeting = await db.collection("meetings").add({
        title,
        meetingType,
        meetingDate,
        meetingTime,
        location,
        virtualLink,
        description,
      });
      return res.status(201).send({id: meeting.id});
    } catch (error) {
      return res.status(500).send(error);
    }
  },
);

app.get(
  "/routes/board-meetings/list",
  async (req: express.Request, res: express.Response) => {
    try {
      const snapshot = await db.collection("meetings").get();
      const meetings: Meeting[] = [];
      snapshot.forEach((doc) => {
        meetings.push({id: doc.id, ...doc.data()} as Meeting);
      });
      return res.status(200).send({meetings});
    } catch (error) {
      return res.status(500).send(error);
    }
  },
);

const api = functions.https.onRequest(app);

export {api};
