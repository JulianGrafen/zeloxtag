import type { TimelineEvent } from "@/lib/validations/timelineSchema";
import { buildTimelineFromDocuments } from "@/services/timeline";
import type { Document } from "@/types/database";

const DEMO_VEHICLE_ID = "veh_demo_e36";

/** Fictional milestones for the public E36 demo (merged with document-derived events). */
const DEMO_SYNTHETIC_EVENTS: TimelineEvent[] = [
  {
    id: "demo_evt_widebody",
    vehicleId: DEMO_VEHICLE_ID,
    mileage: 108_200,
    mileageKnown: true,
    date: "2019-04-12",
    category: "part_install",
    title: "Widebody-Kit montiert",
    description: "Rocket Bunny V1 · Spurverbreiterung VA/HA",
    documentId: null,
    isManualEntry: true,
  },
  {
    id: "demo_evt_gt_wing",
    vehicleId: DEMO_VEHICLE_ID,
    mileage: 115_800,
    mileageKnown: true,
    date: "2020-02-28",
    category: "part_install",
    title: "GT-Flügel & Diffusor",
    description: "Carbon · Track-Setup",
    documentId: null,
    isManualEntry: true,
  },
  {
    id: "demo_evt_trackday",
    vehicleId: DEMO_VEHICLE_ID,
    mileage: 147_600,
    mileageKnown: true,
    date: "2023-06-18",
    category: "other",
    title: "Trackday Hockenheim",
    description: "Setup-Check Fahrwerk · Reifendruck protokolliert",
    documentId: null,
    isManualEntry: true,
  },
];

function mergeDemoTimeline(
  documentEvents: TimelineEvent[],
  synthetic: TimelineEvent[],
): TimelineEvent[] {
  const byId = new Map<string, TimelineEvent>();
  for (const event of [...documentEvents, ...synthetic]) {
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => {
    if (a.mileageKnown && b.mileageKnown && a.mileage !== b.mileage) {
      return b.mileage - a.mileage;
    }
    return b.date.localeCompare(a.date);
  });
}

export function buildDemoTimelineEvents(documents: Document[]): TimelineEvent[] {
  const fromDocs = buildTimelineFromDocuments(documents, "desc");
  return mergeDemoTimeline(fromDocs, DEMO_SYNTHETIC_EVENTS);
}
