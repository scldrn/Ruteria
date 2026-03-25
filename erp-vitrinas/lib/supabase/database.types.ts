export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_categorias_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cobros: {
        Row: {
          created_at: string
          created_by: string | null
          estado: string
          fecha: string
          forma_pago_id: string
          id: string
          monto: number
          notas: string | null
          updated_at: string
          visita_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          forma_pago_id: string
          id?: string
          monto: number
          notas?: string | null
          updated_at?: string
          visita_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          forma_pago_id?: string
          id?: string
          monto?: number
          notas?: string | null
          updated_at?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobros_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_forma_pago_id_fkey"
            columns: ["forma_pago_id"]
            isOneToOne: false
            referencedRelation: "formas_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: true
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          created_at: string
          created_by: string | null
          estado: string
          fecha: string
          id: string
          notas: string | null
          proveedor_id: string
          total_estimado: number | null
          total_real: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha: string
          id?: string
          notas?: string | null
          proveedor_id: string
          total_estimado?: number | null
          total_real?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          id?: string
          notas?: string | null
          proveedor_id?: string
          total_estimado?: number | null
          total_real?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      detalle_compra: {
        Row: {
          cantidad_pedida: number
          cantidad_recibida: number
          compra_id: string
          costo_unitario: number | null
          created_at: string
          created_by: string | null
          id: string
          producto_id: string
          updated_at: string
        }
        Insert: {
          cantidad_pedida: number
          cantidad_recibida?: number
          compra_id: string
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          producto_id: string
          updated_at?: string
        }
        Update: {
          cantidad_pedida?: number
          cantidad_recibida?: number
          compra_id?: string
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          producto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalle_compra_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_compra_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_compra_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      detalle_visita: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inv_actual: number
          inv_anterior: number
          precio_unitario: number
          producto_id: string
          subtotal_cobro: number | null
          unidades_repuestas: number
          unidades_vendidas: number
          updated_at: string
          visita_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inv_actual: number
          inv_anterior: number
          precio_unitario: number
          producto_id: string
          subtotal_cobro?: number | null
          unidades_repuestas?: number
          unidades_vendidas?: number
          updated_at?: string
          visita_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inv_actual?: number
          inv_anterior?: number
          precio_unitario?: number
          producto_id?: string
          subtotal_cobro?: number | null
          unidades_repuestas?: number
          unidades_vendidas?: number
          updated_at?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalle_visita_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_visita_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_visita_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pago: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      fotos_incidencia: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          incidencia_id: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          incidencia_id: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          incidencia_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_incidencia_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_incidencia_incidencia_id_fkey"
            columns: ["incidencia_id"]
            isOneToOne: false
            referencedRelation: "incidencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_incidencia_incidencia_id_fkey"
            columns: ["incidencia_id"]
            isOneToOne: false
            referencedRelation: "v_incidencias_abiertas_recientes"
            referencedColumns: ["incidencia_id"]
          },
        ]
      }
      fotos_visita: {
        Row: {
          fecha_subida: string
          id: string
          tipo: string | null
          url: string
          visita_id: string
        }
        Insert: {
          fecha_subida?: string
          id?: string
          tipo?: string | null
          url: string
          visita_id: string
        }
        Update: {
          fecha_subida?: string
          id?: string
          tipo?: string | null
          url?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_visita_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      garantias: {
        Row: {
          cantidad: number
          created_at: string
          created_by: string | null
          estado: string
          fecha_venta_aprox: string | null
          id: string
          motivo: string | null
          notas_resolucion: string | null
          pdv_id: string
          producto_id: string
          resolucion: string | null
          responsable_id: string | null
          updated_at: string
          visita_recepcion_id: string | null
        }
        Insert: {
          cantidad?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_venta_aprox?: string | null
          id?: string
          motivo?: string | null
          notas_resolucion?: string | null
          pdv_id: string
          producto_id: string
          resolucion?: string | null
          responsable_id?: string | null
          updated_at?: string
          visita_recepcion_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_venta_aprox?: string | null
          id?: string
          motivo?: string | null
          notas_resolucion?: string | null
          pdv_id?: string
          producto_id?: string
          resolucion?: string | null
          responsable_id?: string | null
          updated_at?: string
          visita_recepcion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garantias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "puntos_de_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_visita_recepcion_id_fkey"
            columns: ["visita_recepcion_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      incidencias: {
        Row: {
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado: string
          fecha_apertura: string
          fecha_cierre: string | null
          id: string
          pdv_id: string
          resolucion: string | null
          responsable_id: string | null
          tipo: string
          updated_at: string
          visita_id: string | null
          vitrina_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          fecha_apertura?: string
          fecha_cierre?: string | null
          id?: string
          pdv_id: string
          resolucion?: string | null
          responsable_id?: string | null
          tipo: string
          updated_at?: string
          visita_id?: string | null
          vitrina_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          fecha_apertura?: string
          fecha_cierre?: string | null
          id?: string
          pdv_id?: string
          resolucion?: string | null
          responsable_id?: string | null
          tipo?: string
          updated_at?: string
          visita_id?: string | null
          vitrina_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "puntos_de_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "v_top_vitrinas_mes"
            referencedColumns: ["vitrina_id"]
          },
          {
            foreignKeyName: "incidencias_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "vitrinas"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_central: {
        Row: {
          cantidad_actual: number
          costo_promedio: number | null
          fecha_actualizacion: string
          id: string
          producto_id: string
        }
        Insert: {
          cantidad_actual?: number
          costo_promedio?: number | null
          fecha_actualizacion?: string
          id?: string
          producto_id: string
        }
        Update: {
          cantidad_actual?: number
          costo_promedio?: number | null
          fecha_actualizacion?: string
          id?: string
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_central_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: true
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_colaboradora: {
        Row: {
          cantidad_actual: number
          colaboradora_id: string
          producto_id: string
          updated_at: string
        }
        Insert: {
          cantidad_actual?: number
          colaboradora_id: string
          producto_id: string
          updated_at?: string
        }
        Update: {
          cantidad_actual?: number
          colaboradora_id?: string
          producto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_colaboradora_colaboradora_id_fkey"
            columns: ["colaboradora_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_colaboradora_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_vitrina: {
        Row: {
          cantidad_actual: number
          fecha_actualizacion: string
          id: string
          producto_id: string
          vitrina_id: string
        }
        Insert: {
          cantidad_actual?: number
          fecha_actualizacion?: string
          id?: string
          producto_id: string
          vitrina_id: string
        }
        Update: {
          cantidad_actual?: number
          fecha_actualizacion?: string
          id?: string
          producto_id?: string
          vitrina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_vitrina_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_vitrina_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "v_top_vitrinas_mes"
            referencedColumns: ["vitrina_id"]
          },
          {
            foreignKeyName: "inventario_vitrina_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "vitrinas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          costo_unitario: number | null
          created_at: string
          destino_id: string | null
          destino_tipo: string | null
          direccion: string
          id: string
          motivo_baja: string | null
          notas: string | null
          origen_id: string | null
          origen_tipo: string | null
          producto_id: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          costo_unitario?: number | null
          created_at?: string
          destino_id?: string | null
          destino_tipo?: string | null
          direccion: string
          id?: string
          motivo_baja?: string | null
          notas?: string | null
          origen_id?: string | null
          origen_tipo?: string | null
          producto_id: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          costo_unitario?: number | null
          created_at?: string
          destino_id?: string | null
          destino_tipo?: string | null
          direccion?: string
          id?: string
          motivo_baja?: string | null
          notas?: string | null
          origen_id?: string | null
          origen_tipo?: string | null
          producto_id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          categoria_id: string | null
          codigo: string
          costo_compra: number | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado: string
          id: string
          imagen_url: string | null
          nombre: string
          precio_venta_comercio: number
          unidad_medida: string | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          codigo: string
          costo_compra?: number | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          id?: string
          imagen_url?: string | null
          nombre: string
          precio_venta_comercio: number
          unidad_medida?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          codigo?: string
          costo_compra?: number | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio_venta_comercio?: number
          unidad_medida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_productos_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          condiciones_pago: string | null
          contacto_email: string | null
          contacto_nombre: string | null
          contacto_tel: string | null
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          condiciones_pago?: string | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_tel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          condiciones_pago?: string | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_tel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_proveedores_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      puntos_de_venta: {
        Row: {
          activo: boolean
          codigo: string
          condiciones_pago: string | null
          contacto_nombre: string | null
          contacto_tel: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          forma_pago_preferida: string | null
          id: string
          lat: number | null
          lng: number | null
          nombre_comercial: string
          tipo: string | null
          updated_at: string
          zona_id: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          condiciones_pago?: string | null
          contacto_nombre?: string | null
          contacto_tel?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          forma_pago_preferida?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nombre_comercial: string
          tipo?: string | null
          updated_at?: string
          zona_id?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          condiciones_pago?: string | null
          contacto_nombre?: string | null
          contacto_tel?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          forma_pago_preferida?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nombre_comercial?: string
          tipo?: string | null
          updated_at?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pdv_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntos_de_venta_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      rutas: {
        Row: {
          codigo: string
          colaboradora_id: string | null
          created_at: string
          created_by: string | null
          dias_visita: string[] | null
          estado: string
          frecuencia: string | null
          id: string
          nombre: string
          nota_reasignacion: string | null
          updated_at: string
          zona_id: string | null
        }
        Insert: {
          codigo: string
          colaboradora_id?: string | null
          created_at?: string
          created_by?: string | null
          dias_visita?: string[] | null
          estado?: string
          frecuencia?: string | null
          id?: string
          nombre: string
          nota_reasignacion?: string | null
          updated_at?: string
          zona_id?: string | null
        }
        Update: {
          codigo?: string
          colaboradora_id?: string | null
          created_at?: string
          created_by?: string | null
          dias_visita?: string[] | null
          estado?: string
          frecuencia?: string | null
          id?: string
          nombre?: string
          nota_reasignacion?: string | null
          updated_at?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rutas_colaboradora_id_fkey"
            columns: ["colaboradora_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      rutas_pdv: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          orden_visita: number
          pdv_id: string
          ruta_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          orden_visita: number
          pdv_id: string
          ruta_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          orden_visita?: number
          pdv_id?: string
          ruta_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rutas_pdv_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_pdv_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "puntos_de_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_pdv_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      surtido_estandar: {
        Row: {
          cantidad_objetivo: number
          created_at: string
          created_by: string | null
          id: string
          producto_id: string
          updated_at: string
          vitrina_id: string
        }
        Insert: {
          cantidad_objetivo: number
          created_at?: string
          created_by?: string | null
          id?: string
          producto_id: string
          updated_at?: string
          vitrina_id: string
        }
        Update: {
          cantidad_objetivo?: number
          created_at?: string
          created_by?: string | null
          id?: string
          producto_id?: string
          updated_at?: string
          vitrina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_surtido_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surtido_estandar_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surtido_estandar_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "v_top_vitrinas_mes"
            referencedColumns: ["vitrina_id"]
          },
          {
            foreignKeyName: "surtido_estandar_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "vitrinas"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_operaciones_visita: {
        Row: {
          client_sync_id: string
          created_by: string | null
          payload_hash: string | null
          procesado_at: string
          tipo: string
          visita_id: string
        }
        Insert: {
          client_sync_id: string
          created_by?: string | null
          payload_hash?: string | null
          procesado_at?: string
          tipo: string
          visita_id: string
        }
        Update: {
          client_sync_id?: string
          created_by?: string | null
          payload_hash?: string | null
          procesado_at?: string
          tipo?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_operaciones_visita_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_operaciones_visita_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string | null
          email: string
          id: string
          nombre: string
          rol: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          id: string
          nombre: string
          rol?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          nombre?: string
          rol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      visitas: {
        Row: {
          colaboradora_id: string
          created_at: string
          created_by: string | null
          diferencia: number | null
          estado: string
          fecha_hora_fin: string | null
          fecha_hora_inicio: string | null
          id: string
          monto_calculado: number
          monto_cobrado: number | null
          motivo_no_realizada: string | null
          notas: string | null
          pdv_id: string
          ruta_id: string | null
          updated_at: string
          vitrina_id: string
        }
        Insert: {
          colaboradora_id: string
          created_at?: string
          created_by?: string | null
          diferencia?: number | null
          estado?: string
          fecha_hora_fin?: string | null
          fecha_hora_inicio?: string | null
          id?: string
          monto_calculado?: number
          monto_cobrado?: number | null
          motivo_no_realizada?: string | null
          notas?: string | null
          pdv_id: string
          ruta_id?: string | null
          updated_at?: string
          vitrina_id: string
        }
        Update: {
          colaboradora_id?: string
          created_at?: string
          created_by?: string | null
          diferencia?: number | null
          estado?: string
          fecha_hora_fin?: string | null
          fecha_hora_inicio?: string | null
          id?: string
          monto_calculado?: number
          monto_cobrado?: number | null
          motivo_no_realizada?: string | null
          notas?: string | null
          pdv_id?: string
          ruta_id?: string | null
          updated_at?: string
          vitrina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitas_colaboradora_id_fkey"
            columns: ["colaboradora_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "puntos_de_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "v_top_vitrinas_mes"
            referencedColumns: ["vitrina_id"]
          },
          {
            foreignKeyName: "visitas_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "vitrinas"
            referencedColumns: ["id"]
          },
        ]
      }
      vitrinas: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          estado: string
          fecha_instalacion: string | null
          fecha_retiro: string | null
          id: string
          notas: string | null
          pdv_id: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_instalacion?: string | null
          fecha_retiro?: string | null
          id?: string
          notas?: string | null
          pdv_id: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_instalacion?: string | null
          fecha_retiro?: string | null
          id?: string
          notas?: string | null
          pdv_id?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vitrinas_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitrinas_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "puntos_de_venta"
            referencedColumns: ["id"]
          },
        ]
      }
      zonas: {
        Row: {
          ciudad: string | null
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          region: string | null
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_zonas_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventario_valorizado: {
        Row: {
          cantidad_actual: number | null
          costo_unitario_ref: number | null
          precio_venta_ref: number | null
          producto_codigo: string | null
          producto_id: string | null
          producto_nombre: string | null
          ubicacion_id: string | null
          ubicacion_nombre: string | null
          ubicacion_tipo: string | null
          updated_at: string | null
          valor_costo_total: number | null
          valor_venta_total: number | null
        }
        Relationships: []
      }
      movimientos_inventario_detalle: {
        Row: {
          cantidad: number | null
          costo_unitario: number | null
          created_at: string | null
          destino_id: string | null
          destino_label: string | null
          destino_tipo: string | null
          direccion: string | null
          id: string | null
          motivo_baja: string | null
          notas: string | null
          origen_id: string | null
          origen_label: string | null
          origen_tipo: string | null
          producto_codigo: string | null
          producto_id: string | null
          producto_nombre: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string | null
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dashboard_hoy: {
        Row: {
          cobros_mes: number | null
          incidencias_abiertas: number | null
          ventas_hoy: number | null
          visitas_planificadas: number | null
          visitas_realizadas: number | null
        }
        Relationships: []
      }
      v_incidencias_abiertas_recientes: {
        Row: {
          dias_abierta: number | null
          fecha_apertura: string | null
          incidencia_id: string | null
          pdv_nombre: string | null
          tipo: string | null
        }
        Relationships: []
      }
      v_stock_bajo: {
        Row: {
          cantidad_objetivo: number | null
          pct_stock: number | null
          pdv_nombre: string | null
          producto_id: string | null
          producto_nombre: string | null
          stock_actual: number | null
          vitrina_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_vitrina_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_vitrina_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "v_top_vitrinas_mes"
            referencedColumns: ["vitrina_id"]
          },
          {
            foreignKeyName: "inventario_vitrina_vitrina_id_fkey"
            columns: ["vitrina_id"]
            isOneToOne: false
            referencedRelation: "vitrinas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_top_vitrinas_mes: {
        Row: {
          pdv_nombre: string | null
          total_ventas: number | null
          vitrina_id: string | null
        }
        Relationships: []
      }
      v_ventas_30_dias: {
        Row: {
          fecha: string | null
          total_ventas: number | null
        }
        Relationships: []
      }
      v_ventas_por_ruta_mes: {
        Row: {
          colaboradora: string | null
          ruta: string | null
          total_ventas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assert_reportes_analiticos_access: { Args: never; Returns: undefined }
      calcular_monto_visita: { Args: { p_visita_id: string }; Returns: number }
      cerrar_visita: {
        Args: { p_cobro: Json; p_reposiciones?: Json; p_visita_id: string }
        Returns: undefined
      }
      cerrar_visita_core: {
        Args: { p_cobro: Json; p_reposiciones?: Json; p_visita_id: string }
        Returns: undefined
      }
      cerrar_visita_offline: {
        Args: {
          p_client_sync_id?: string
          p_cobro: Json
          p_reposiciones?: Json
          p_visita_id: string
        }
        Returns: undefined
      }
      get_kpi_ventas: {
        Args: { fecha_fin: string; fecha_inicio: string }
        Returns: {
          colaboradora_id: string
          pdv_id: string
          ruta_id: string
          total_cobrado: number
          total_vendido: number
          visitas_completadas: number
        }[]
      }
      get_my_rol: { Args: never; Returns: string }
      get_ranking_vitrinas: {
        Args: {
          p_desde_actual: string
          p_desde_anterior: string
          p_hasta_actual: string
          p_hasta_anterior: string
        }
        Returns: {
          pdv_nombre: string
          variacion_pct: number
          ventas_actual: number
          ventas_anterior: number
          vitrina_id: string
        }[]
      }
      get_reporte_incidencias_garantias: {
        Args: {
          p_desde: string
          p_hasta: string
          p_pdv_id?: string
          p_tipo?: string
        }
        Returns: {
          descripcion_o_motivo: string
          dias_abierta: number
          estado: string
          fecha_apertura: string
          fecha_cierre: string
          pdv_nombre: string
          tipo_registro: string
        }[]
      }
      get_reporte_ventas: {
        Args: {
          p_colaboradora_id?: string
          p_desde: string
          p_hasta: string
          p_pdv_id?: string
          p_producto_id?: string
          p_ruta_id?: string
        }
        Returns: {
          colaboradora_nombre: string
          fecha: string
          forma_pago: string
          monto_cobrado: number
          pdv_nombre: string
          ruta_nombre: string
          unidades_vendidas: number
        }[]
      }
      get_reporte_visitas: {
        Args: { p_desde: string; p_hasta: string; p_ruta_id?: string }
        Returns: {
          colaboradora_nombre: string
          estado: string
          fecha_planificada: string
          motivo_no_realizada: string
          pdv_nombre: string
          ruta_nombre: string
        }[]
      }
      recibir_compra: {
        Args: { p_compra_id: string; p_items: Json }
        Returns: undefined
      }
      registrar_garantia: {
        Args: {
          p_cantidad: number
          p_fecha_venta_aprox?: string
          p_garantia_id: string
          p_motivo: string
          p_pdv_id: string
          p_producto_id: string
          p_visita_recepcion_id: string
        }
        Returns: string
      }
      resolver_garantia: {
        Args: { p_garantia_id: string; p_notas?: string; p_resolucion: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

