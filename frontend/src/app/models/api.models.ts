export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface PaginationParams {
  page?: number
  size?: number
  search?: string
}

export interface ApiError {
  detail: string
}

// Auth
export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// User
export interface Role {
  id: number
  name: string
  description: string | null
  created_at: string
}

export interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
  created_at: string
  updated_at: string
  roles?: Role[]
}

export interface UserCreate {
  email: string
  full_name: string
  password: string
  is_active?: boolean
  role_ids?: number[]
}

export interface UserUpdate {
  email?: string
  full_name?: string
  is_active?: boolean
  password?: string
  role_ids?: number[]
}

export interface RoleCreate {
  name: string
  description?: string | null
}

// Category
export interface Category {
  id: number
  name: string
  description: string | null
  parent_id: number | null
  created_at: string
  children?: Category[]
}

export interface CategoryCreate {
  name: string
  description?: string | null
  parent_id?: number | null
}

export interface CategoryUpdate {
  name?: string
  description?: string | null
  parent_id?: number | null
}

// Unit
export interface Unit {
  id: number
  name: string
  symbol: string
  created_at: string
}

export interface UnitCreate {
  name: string
  symbol: string
}

// Supplier
export interface Supplier {
  id: number
  name: string
  contact_name: string
  email: string
  phone: string
  address: string | null
  tax_id: string
  is_active: boolean
  created_at: string
}

export interface SupplierCreate {
  name: string
  contact_name: string
  email: string
  phone: string
  address?: string | null
  tax_id: string
  is_active?: boolean
}

export interface SupplierUpdate {
  name?: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string | null
  tax_id?: string
  is_active?: boolean
}

// Customer
export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  is_active: boolean
  created_at: string
}

export interface CustomerCreate {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  tax_id?: string | null
  is_active?: boolean
}

export interface CustomerUpdate {
  name?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  tax_id?: string | null
  is_active?: boolean
}

// Warehouse
export interface Warehouse {
  id: number
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

export interface WarehouseCreate {
  name: string
  address?: string | null
  is_active?: boolean
}

export interface WarehouseUpdate {
  name?: string
  address?: string | null
  is_active?: boolean
}

// Product
export interface Product {
  id: number
  name: string
  sku: string
  description: string | null
  category_id: number | null
  unit_id: number | null
  purchase_price: string
  sale_price: string
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductCreate {
  name: string
  sku: string
  description?: string | null
  category_id?: number | null
  unit_id?: number | null
  purchase_price?: string
  sale_price?: string
  min_stock?: number
  is_active?: boolean
}

export interface ProductUpdate {
  name?: string
  sku?: string
  description?: string | null
  category_id?: number | null
  unit_id?: number | null
  purchase_price?: string
  sale_price?: string
  min_stock?: number
  is_active?: boolean
}

// Inventory
export interface StockItem {
  id: number
  product_id: number
  warehouse_id: number
  warehouse_name?: string
  product?: Product
  warehouse?: Warehouse
  quantity: number
  minimum_stock: number
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: number
  product_id: number | null
  warehouse_id: number | null
  to_warehouse_id: number | null
  movement_type: string
  quantity: number
  stock_before: number
  stock_after: number
  reference_type: string | null
  reference_id: number | null
  notes: string | null
  created_by: number | null
  created_at: string
}

export interface AdjustmentCreate {
  product_id: number
  warehouse_id: number
  quantity: number
  notes?: string | null
}

export interface AdjustmentResponse {
  detail: string
  new_quantity: number
}

// Purchase
export interface PurchaseItem {
  id: number
  product_id: number | null
  quantity: number
  unit_price: string
  subtotal: string
  product?: Product
}

export interface Purchase {
  id: number
  supplier_id: number | null
  warehouse_id: number | null
  reference_number: string | null
  total_amount: string
  notes: string | null
  status: string
  created_by: number | null
  created_at: string
  updated_at: string
  items: PurchaseItem[]
  supplier?: Supplier
  warehouse?: Warehouse
}

export interface PurchaseItemCreate {
  product_id: number
  quantity: number
  unit_price: string
}

export interface PurchaseCreate {
  supplier_id?: number | null
  warehouse_id?: number | null
  reference_number?: string | null
  notes?: string | null
  items: PurchaseItemCreate[]
}

// Sale
export interface SaleItem {
  id: number
  product_id: number | null
  quantity: number
  unit_price: string
  subtotal: string
  product?: Product
}

export interface Sale {
  id: number
  customer_id: number | null
  warehouse_id: number | null
  reference_number: string | null
  total_amount: string
  notes: string | null
  status: string
  created_by: number | null
  created_at: string
  updated_at: string
  items: SaleItem[]
  customer?: Customer
  warehouse?: Warehouse
}

export interface SaleItemCreate {
  product_id: number
  quantity: number
  unit_price: string
}

export interface SaleCreate {
  customer_id?: number | null
  warehouse_id?: number | null
  reference_number?: string | null
  notes?: string | null
  items: SaleItemCreate[]
}
