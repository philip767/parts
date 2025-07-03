
export interface NoteImage {
  id: string; // Corresponds to imageId from backend
  imageUrl: string; // URL from backend
  imageName: string; // Original name, or name from backend
  imageType?: string; // MIME type
  uploadedAt?: string; // From backend
}

export interface EnhancedNote {
  text: string;
  images: NoteImage[];
}

export interface Part {
  id:string;
  partNumber: string;
  partName: string;
  quantity: number;
  notes: EnhancedNote; 
  supplier: string | null; // Updated: Can be null
  purchaser: string | null; // Updated: Can be null
  estimatedShippingDate: string | null; // Updated: Can be null (YYYY-MM-DD or null)
  isArrived: boolean;
  isOrderComplete: boolean;
  sortOrder?: number;
  deletedDate?: string; // ISO datetime string, for recycle bin within an order
  orderId?: string; // To link back to the order, useful if part is handled standalone
  
  // New fields for monitoring
  initialStock?: number | null;
  latestStock?: number | null;
  lastStockCheck?: string | null;
  stockCheckInterval?: number;
  isMonitored?: boolean;
}

export interface Order {
  id: string;
  userId?: string; // From backend, associates order with a user
  name: string;
  uploadDate: string; // ISO datetime string
  fileName: string;
  parts?: Part[]; // Optional: Only present in detailed view
  partCount?: number; // Optional: Only present in list view
  recycledParts?: Part[]; // Parts that were "deleted" from this order and can be restored
  deletedDate?: string; // ISO datetime string, if the whole order is in recycle bin
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string; // Optional: for admin view
}

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
  token: string;
  role: 'user' | 'admin';
  emailInfo?: {
    email: string;
    passwordHint: string;
  };
}


// Defines the scaffold for creating a new part.
// 'notesText' is a temporary field for the initial text of the note.
// It will be converted to the 'notes: EnhancedNote' structure before API submission.
export interface PartScaffoldForCreate extends Omit<Part, 'id' | 'notes' | 'orderId' | 'deletedDate'> {
  notesText: string;
}

// For /api/inventory/search (quick preview, still used by InventoryStockModal)
export interface InventorySearchResult {
  partNumber: string;
  stockQuantity: number;
}

// For /api/inventory/search-full-details (main inventory search)
export interface InventoryFullDetailsResult {
  partNumber: string;
  partNameCn: string;
  vehicleModel: string | null;
  origin: string | null;
  unit: string | null;
  stockQuantity: number;
  notes: string | null;
}

// New type for the Smart Memo feature
export interface Memo {
  id: string;
  userId: string;
  task: string;
  dueDateTime: string | null; // ISO 8601 string, or null if no date
  partNumber: string | null;
  isCompleted: boolean;
  createdAt: string;
  // New fields for AI Executor
  orderName: string | null;
  taskType: 'add_part' | 'reminder';
}

// New type for Admin view of Orders
export interface AdminOrder extends Order {
  user: {
      id: string;
      username: string;
  }
}

// Interface for the data structure specifically for CSV export rows
export interface CsvExportRow {
    orderPartNumberOriginal: string;
    orderPartNameOriginal: string | null;
    inventoryPartNumber: string | null; 
    partNameCn: string | null;          
    vehicleModel: string | null;        
    origin: string | null;
    unit: string | null;
    stockQuantity: number | string;
    notes: string | null; // Cleaned inventory note or placeholder message
}

// For Quote Management Feature
export interface Quote {
    quoteId: string;
    quoteDate: string; // ISO 8601 string
    customerName: string;
    priceRMB: string | null; // Formatted as string
    notes: string | null;
}

// For GET /api/quotes/search
export interface QuoteGroup {
    partNumber: string;
    quotes: Quote[];
}

// A single item within a quote inquiry
export interface QuoteInquiryItem {
  id: string; // Unique ID for this item in the inquiry
  queryPartNumber: string;
  partNumber?: string; // For backend compatibility
  selectedQuoteId: string | null;
  quotes: Quote[];
  quotesJson?: Quote[]; // For backend compatibility
}

// The main quote inquiry object
export interface QuoteInquiry {
  id: string;
  userId: string;
  fileName: string;
  createdAt: string; // ISO 8601 string
  itemCount: number;
  customerName: string; // Newly added
  inquiryDetails?: QuoteInquiryItem[]; // Preferred property name
  items?: QuoteInquiryItem[]; // Actual property name from backend, for robustness
}


// For Quote Inquiry Export (based on selected quotes)
export interface QuoteExportRow {
    partNumber: string;
    quoteDate: string;
    customerName: string;
    priceRMB: string; // Pure number formatted to 2 decimal places
}