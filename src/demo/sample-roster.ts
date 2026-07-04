/** Sample roster for the public demo — no real client PII. */
export const DEMO_EVENT_ID = 'demo-serve-day-2026';

export const DEMO_ROSTER = {
  eventId: DEMO_EVENT_ID,
  eventName: 'Demo Community Serve Day',
  source: 'demo' as const,
  volunteers: [
    {
      id: 'demo-v1',
      name: 'Alex R.',
      skills: ['greeter', 'spanish'],
      availability: ['sat-am'],
    },
    {
      id: 'demo-v2',
      name: 'Jordan M.',
      skills: ['logistics', 'driving'],
      availability: ['sat-am', 'sat-pm'],
    },
    {
      id: 'demo-v3',
      name: 'Sam T.',
      skills: ['kids', 'first-aid'],
      availability: ['sat-pm'],
    },
    {
      id: 'demo-v4',
      name: 'Riley K.',
      skills: ['greeter', 'setup'],
      availability: ['sat-am'],
    },
  ],
  openShifts: [
    {
      id: 'demo-s1',
      title: 'Welcome desk',
      startTime: '2026-08-09T08:00:00',
      capacity: 2,
      assignedVolunteerIds: [] as string[],
    },
    {
      id: 'demo-s2',
      title: 'Parking & logistics',
      startTime: '2026-08-09T07:30:00',
      capacity: 1,
      assignedVolunteerIds: [] as string[],
    },
    {
      id: 'demo-s3',
      title: 'Kids ministry helper',
      startTime: '2026-08-09T10:00:00',
      capacity: 1,
      assignedVolunteerIds: [] as string[],
    },
  ],
};

export type DemoQueuedAction = {
  actionId: string;
  actionType: string;
  summary: string;
  status: 'pending_human_review';
};

/** In-memory queue for demo runs — never touches production collections. */
export const demoActionQueue: DemoQueuedAction[] = [];

export function resetDemoQueue(): void {
  demoActionQueue.length = 0;
}

export function queueDemoAction(entry: Omit<DemoQueuedAction, 'actionId' | 'status'>): DemoQueuedAction {
  const action: DemoQueuedAction = {
    actionId: `demo_action_${Date.now()}_${demoActionQueue.length + 1}`,
    status: 'pending_human_review',
    ...entry,
  };
  demoActionQueue.push(action);
  return action;
}
