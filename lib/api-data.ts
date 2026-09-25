import { apiRequest } from "@/lib/api-client";
import type { PaginatedResponse } from "@/lib/types";

export interface ApiEquipment {
  id: string;
  assetNo: string;
  equipmentTypeId: string;
  equipmentType: string;
  equipmentTypeDetails: { id: string; name: string };
  manufacturer: string;
  model: string;
  engineModel?: string | null;
  engineSerialNo?: string | null;
  bimanSerialNo?: string | null;
  tldSerialNo?: string | null;
  location: string;
  status: string;
  hourMeter: number;
  actualGTDate?: string | null;
  shipDate?: string | null;
  shippingStatus?: string | null;
  emissionRating?: string | null;
  specifications: { id?: string; label: string; value: string }[];
  equipmentPhotos: string[];
  photos: { id: string; slot: "PRIMARY" | "FRONT" | "SIDE" | "OTHER"; url: string; thumbnailUrl: string }[];
  documents: {
    id: string;
    name: string;
    type: string;
    expiryDate?: string | null;
    uploadedAt: string;
    uploadedDate: string;
    fileId: string;
    url: string;
  }[];
  hourMeterReadings?: { id: string; value: number; recordedAt: string; recordedBy: string }[];
}

export interface ApiTicket {
  id: string;
  ticketNo: string;
  serviceType: string;
  equipmentId: string;
  equipment: { id: string; assetNo: string; model: string; equipmentType: string };
  pmServiceId?: string | null;
  pmType?: string;
  faultDescription?: string | null;
  priority: string;
  status: string;
  dueDate: string;
  createdAt: string;
  createdDate: string;
  createdBy?: { id: string; name: string; email: string };
  assignedEngineer?: { id: string; name: string } | null;
  assignedEngineerId?: string | null;
  requestingParty?: string | null;
  closedDate?: string | null;
  downtimeHours?: number | null;
  maintenanceRecord?: {
    id: string;
    problemDescription?: string | null;
    checklistItems?: { id: string; category: string; label: string; checked: boolean }[];
    inspectionChecklist?: { id: string; category: string; label: string; checked: boolean }[];
    partsUsed?: string | null;
    labourHours?: number | null;
    functionalTestPassed?: boolean | null;
    safetyCheckPassed?: boolean | null;
    workImages?: { id: string; url: string; thumbnailUrl: string }[];
    engineerFeedback?: string;
  } | null;
  feedback?: {
    id: string;
    bodyHtml: string;
    createdAt: string;
    author?: { id: string; name: string };
    images?: { id: string; url: string; thumbnailUrl: string }[];
  }[];
  history?: { id: string; label: string; timestamp: string; actor?: string }[];
  requests?: ApiRequest[];
}

export interface ApiRequest {
  id: string;
  requestNo: string;
  ticketId: string;
  equipmentId: string;
  item: string;
  quantity: number;
  reason: string;
  status: string;
  requestedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string } | null;
  createdAt: string;
  approvedAt?: string | null;
  receivedAt?: string | null;
  ticket?: { id: string; ticketNo: string; equipment?: { id: string; assetNo: string } };
  equipment?: { id: string; assetNo: string };
}

export interface ApiSchedule {
  id: string;
  scheduleNo: string;
  equipmentId: string;
  lastDate: string;
  dueDate: string;
  status: string;
  ticketId?: string | null;
  equipment: { id: string; assetNo: string; equipmentType: { name: string } };
  ticket?: { id: string; ticketNo: string; status: string } | null;
}

export async function fetchAllPages<T>(path: string, params: Record<string, string> = {}) {
  const limit = 100;
  let page = 1;
  let total = Infinity;
  const items: T[] = [];
  while (items.length < total) {
    const query = new URLSearchParams({ ...params, page: String(page), limit: String(limit) });
    const result = await apiRequest<PaginatedResponse<T>>(`${path}?${query}`);
    items.push(...result.items);
    total = result.total;
    if (!result.items.length) break;
    page += 1;
  }
  return items;
}

export function displayDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
