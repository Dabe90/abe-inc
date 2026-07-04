export { recordInquiryTool } from './record-inquiry.js';
export { getEventRosterTool } from './get-event-roster.js';
export { proposeVolunteerMatchesTool } from './propose-volunteer-matches.js';
export { queueCoordinatorActionTool } from './queue-coordinator-action.js';

import { recordInquiryTool } from './record-inquiry.js';
import { getEventRosterTool } from './get-event-roster.js';
import { proposeVolunteerMatchesTool } from './propose-volunteer-matches.js';
import { queueCoordinatorActionTool } from './queue-coordinator-action.js';

/** All tools available to production agents in this repo. */
export const volunteerCoordinatorTools = [
  getEventRosterTool,
  proposeVolunteerMatchesTool,
  queueCoordinatorActionTool,
  recordInquiryTool,
];
