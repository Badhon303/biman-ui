export type Role = "Super Admin" | "Manager" | "Engineer" | "Biman Admin";
export type EquipmentStatus = "Available" | "Under Maintenance" | "Out of Service" | "Inactive";
export type TicketType =
  | "F-Service"
  | "B-Service"
  | "C-Service"
  | "D-Service"
  | "E-Service"
  | "V-Service"
  | "Breakdown"
  | "General"
  | "Washing"
  | "Others";
export type TicketStatus =
  | "Open"
  | "Assigned"
  | "In Progress"
  | "Awaiting Parts"
  | "Awaiting Verification"
  | "Completed"
  | "Closed";
export type RequestStatus = "Pending" | "Approved" | "Rejected" | "Received";
export type ScheduleStatus = "Scheduled" | "Due soon" | "Overdue";

export interface Specification {
  label: string;
  value: string;
}
export interface EquipmentDocument {
  id: string;
  name: string;
  type: string;
  expiryDate?: string;
  uploadedDate: string;
}
export interface HourMeterReading {
  id: string;
  value: number;
  recordedAt: string;
  recordedBy: string;
}
export interface Equipment {
  id: string;
  assetNo: string;
  equipmentType: string;
  manufacturer: string;
  model: string;
  engineModel: string;
  engineSerialNo: string;
  bimanSerialNo: string;
  TLDSerialNo: string;
  location: string;
  status: EquipmentStatus;
  hourMeter?: number;
  hourMeterHistory?: HourMeterReading[];
  actualGTDate?: string;
  shipDate?: string;
  shippingStatus?: string;
  emissionRatting?: string;
  equipmentPhotos: string[];
  specifications: Specification[];
  documents: EquipmentDocument[];
}

export interface EquipmentTypeService {
  id: string;
  name: string;
  minHours?: number;
  maxHours?: number;
  months?: number;
}
export interface EquipmentType {
  id: string;
  name: string;
  services: EquipmentTypeService[];
}

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  checked: boolean;
}
export interface MaintenanceRecord {
  problemDescription: string;
  inspectionChecklist: ChecklistItem[];
  workImages: string[];
  partsUsed: string;
  labourHours: number;
  engineerFeedback: string;
  functionalTestPassed: boolean;
  safetyCheckPassed: boolean;
}
export interface TicketHistory {
  id: string;
  label: string;
  timestamp: string;
  actor: string;
}
export interface Ticket {
  id: string;
  ticketNo: string;
  serviceType: TicketType;
  equipmentId: string;
  pmType?: string;
  faultDescription?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: TicketStatus;
  dueDate: string;
  createdDate: string;
  assignedEngineer?: string;
  createdBy: string;
  requestingParty: string;
  closedDate?: string;
  downtimeHours?: number;
  maintenanceRecord: MaintenanceRecord;
  history: TicketHistory[];
}

export interface MaintenanceSchedule {
  id: string;
  scheduleNo: string;
  equipmentId: string;
  lastDate: string;
  dueDate: string;
  status: ScheduleStatus;
  ticketId?: string;
}

export interface EquipmentRequest {
  id: string;
  requestNo: string;
  item: string;
  quantity: number;
  reason: string;
  ticketId: string;
  equipmentId: string;
  requestedBy: string;
  requestedDate: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedDate?: string;
}
export interface AppNotification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
}
export type Notification = AppNotification;
export interface User {
  id: string;
  name: string;
  role: Role;
  organization: string;
  status: "Active" | "Inactive";
  initials: string;
  email: string;
}
export interface DocumentItem {
  id: string;
  name: string;
  assetNo: string;
  expiry?: string;
  type: string;
}
