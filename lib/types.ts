export type Role = 'Super Admin' | 'Manager' | 'Engineer' | 'Biman Admin'
export type EquipmentStatus = 'Available' | 'Under Maintenance' | 'Out of Service' | 'Inactive'
export type TicketType = 'Preventive Maintenance' | 'Breakdown Maintenance' | 'General Maintenance' | 'Washing Schedule'
export type TicketStatus = 'Open' | 'Assigned' | 'In Progress' | 'Awaiting Parts' | 'Awaiting Verification' | 'Completed' | 'Closed'
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Received'
export type ScheduleType = 'Preventive Maintenance' | 'Washing'
export type ScheduleStatus = 'Scheduled' | 'Due soon' | 'Overdue' | 'In progress' | 'Completed'

export interface Specification { label: string; value: string }
export interface EquipmentDocument { id: string; name: string; type: string; expiryDate?: string; uploadedDate: string }
export interface Equipment {
  id: string
  assetNo: string
  type: string
  manufacturer: string
  model: string
  bimanSerialNo: string
  name?: string
  registrationNo?: string
  location: string
  status: EquipmentStatus
  hourMeter?: number
  actualGTDate?: string
  shipDate?: string
  shippingStatus?: string
  emissionRatting?: string
  equipmentPhotos: string[]
  specifications: Specification[]
  documents: EquipmentDocument[]
  // Operational records used by maintenance and washing screens.
  lastPmDate: string
  lastWashDate: string
  nextWashDate: string
  insuranceExpiry: string
  batteryWaterTopUpDue?: string
}

export interface ChecklistItem { id: string; label: string; checked: boolean }
export interface MaintenanceRecord {
  problemDescription: string
  inspectionChecklist: ChecklistItem[]
  rootCause: string
  repairActivity: string
  correctiveAction: string
  partsUsed: string
  labourHours: number
  engineerNotes: string
  functionalTestPassed: boolean
  safetyCheckPassed: boolean
  finalApproval: boolean
}
export interface TicketHistory { id: string; label: string; timestamp: string; actor: string }
export interface Ticket {
  id: string
  ticketNo: string
  type: TicketType
  equipmentId: string
  pmType?: string
  faultDescription?: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: TicketStatus
  dueDate: string
  createdDate: string
  assignedEngineer?: string
  createdBy: string
  requestingParty: string
  closedDate?: string
  downtimeHours?: number
  maintenanceRecord: MaintenanceRecord
  history: TicketHistory[]
}

export interface MaintenanceSchedule {
  id: string
  scheduleNo: string
  type: ScheduleType
  equipmentId: string
  activity: string
  frequency: string
  lastDate: string
  dueDate: string
  scheduleDuration: string
  status: ScheduleStatus
  ticketId?: string
  assignedEngineer?: string
}

export interface EquipmentRequest {
  id: string
  requestNo: string
  item: string
  quantity: number
  reason: string
  ticketId: string
  equipmentId: string
  requestedBy: string
  requestedDate: string
  status: RequestStatus
  approvedBy?: string
  approvedDate?: string
}
export interface AppNotification { id: string; type: string; message: string; timestamp: string; read: boolean }
export type Notification = AppNotification
export interface User { id: string; name: string; role: Role; organization: string; status: 'Active' | 'Inactive'; initials: string; email: string }
export interface DocumentItem { id: string; name: string; assetNo: string; expiry?: string; type: string }
