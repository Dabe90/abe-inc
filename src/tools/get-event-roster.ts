import { z } from 'genkit';
import { ai } from '../../genkit.config.js';

const volunteerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  skills: z.array(z.string()).default([]),
  availability: z.array(z.string()).default([]),
});

const shiftSchema = z.object({
  id: z.string(),
  title: z.string(),
  startTime: z.string(),
  capacity: z.number(),
  assignedVolunteerIds: z.array(z.string()).default([]),
});

/** Loads volunteer roster and open shifts for an event from Firestore (with demo fallback). */
export const getEventRosterTool = ai.defineTool(
  {
    name: 'getEventRoster',
    description:
      'Fetch volunteers and open shifts for an event. Always call this first when coordinating a new eventId.',
    inputSchema: z.object({
      eventId: z.string().describe('Prayer City / nonprofit event identifier'),
    }),
    outputSchema: z.object({
      eventId: z.string(),
      eventName: z.string(),
      volunteers: z.array(volunteerSchema),
      openShifts: z.array(shiftSchema),
      source: z.enum(['firestore', 'demo']),
    }),
  },
  async ({ eventId }) => {
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      const eventSnap = await db.collection('events').doc(eventId).get();
      const [volunteerSnap, shiftSnap] = await Promise.all([
        db.collection('events').doc(eventId).collection('volunteers').get(),
        db.collection('events').doc(eventId).collection('shifts').get(),
      ]);

      const volunteers = volunteerSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: String(data.name || 'Volunteer'),
          email: data.email ? String(data.email) : undefined,
          skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
          availability: Array.isArray(data.availability) ? data.availability.map(String) : [],
        };
      });
      const openShifts = shiftSnap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: String(data.title || 'Shift'),
            startTime: String(data.startTime || ''),
            capacity: Number(data.capacity || 1),
            assignedVolunteerIds: Array.isArray(data.assignedVolunteerIds)
              ? data.assignedVolunteerIds.map(String)
              : [],
          };
        })
        .filter((shift) => shift.assignedVolunteerIds.length < shift.capacity);

      if (volunteers.length > 0 || openShifts.length > 0) {
        return {
          eventId,
          eventName: String(eventSnap.data()?.name || eventId),
          volunteers,
          openShifts,
          source: 'firestore' as const,
        };
      }
    } catch (err) {
      console.warn('[getEventRoster] Firestore read failed, using demo roster:', err);
    }

    return {
      eventId,
      eventName: 'Demo Serve Day',
      source: 'demo' as const,
      volunteers: [
        {
          id: 'v1',
          name: 'Maria Lopez',
          email: 'maria@example.com',
          skills: ['greeter', 'spanish'],
          availability: ['sat-am', 'sat-pm'],
        },
        {
          id: 'v2',
          name: 'James Chen',
          email: 'james@example.com',
          skills: ['logistics', 'driving'],
          availability: ['sat-am'],
        },
        {
          id: 'v3',
          name: 'Aisha Patel',
          email: 'aisha@example.com',
          skills: ['kids', 'first-aid'],
          availability: ['sat-pm'],
        },
      ],
      openShifts: [
        {
          id: 's1',
          title: 'Registration desk',
          startTime: '2026-07-12T08:00:00',
          capacity: 2,
          assignedVolunteerIds: [],
        },
        {
          id: 's2',
          title: 'Parking & logistics',
          startTime: '2026-07-12T07:30:00',
          capacity: 1,
          assignedVolunteerIds: [],
        },
      ],
    };
  },
);
