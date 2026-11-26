import { useState } from "react";
import toast from "react-hot-toast";

import axiosInstance from "../../api/axiosintance";
import DecodeToken from "../../api/decode";

export default function useInvoiceSiigo() {
  const [isLoading, setLoading] = useState(false);

  /**
   * Facturar venta:
   * @param {object} invoice Datos de la venta
   * @param {boolean} isDirect true = Facturación directa con Siigo en vivo, false = Facturación POS con sincronización en 5 min
   */
  const POST_InvoiceSiigo = async (invoice, isDirect = true) => {
    setLoading(true);

    const token = DecodeToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const company = token.company;

    // Datos base (los que se envían a Siigo o al POS)
    const baseData = { ...invoice, company, seller: token.id };

    try {
      if (isDirect) {
        // =================================================================
        // MODO 1: FACTURACIÓN DIRECTA CON SIIGO (Mismo método tradicional)
        // =================================================================
        let code = null;
        let client = "36faa3ab-12cf-45b8-b144-d3c91e6731d2";
        let cufe = null;

        if (baseData.items.length > 0) {
          // 1) Crear factura en Siigo
          const resSiigo = await axiosInstance.post(`/posinnovate/siigo/sale/invoice`, baseData);
          toast.success(resSiigo.message || "Factura creada en Siigo");

          const siigoInvoice = resSiigo.data ?? {};
          console.log("Factura devuelta por Siigo:", siigoInvoice);

          code = siigoInvoice?.name ?? "Pendiente...";
          client = siigoInvoice?.customer?.id ?? "36faa3ab-12cf-45b8-b144-d3c91e6731d2";
          cufe = siigoInvoice?.stamp?.cufe ?? "Pendiente...";

          // 2) Intentar buscar CUFE (sin romper el flujo)
          if (cufe === "Pendiente...") {
            try {
              await new Promise(r => setTimeout(r, 3000));
              const invoiceWithCufe = await axiosInstance.get(
                `/posinnovate/siigo/sale/invoice/by/${code}/${company}`
              );
              cufe = invoiceWithCufe?.data?.stamp?.cufe ?? "Documento en proceso de validación DIAN...";
            } catch (error) {
              console.warn("No se pudo obtener el CUFE todavía:", error.message);
              cufe = "Documento en proceso de validación DIAN...";
            }
          }
        } else {
          const numero = Math.floor(1000 + Math.random() * 9000);
          code = `FV-POS-${numero}`;
          cufe = "......";
        }

        const payloadPOS = { ...baseData, code, client, cufe, sync_mode: "direct" };
        console.log("Guardando en POS (Directo):", payloadPOS);

        // 3) Guardar en base local del POS
        const resPOS = await axiosInstance.post(`/posinnovate/siigo/sale/invoice/pos`, payloadPOS);
        toast.success(resPOS?.message || "Venta guardada en POS");

        return resPOS?.data;

      } else {
        // =================================================================
        // MODO 2: FACTURACIÓN POS CON SINCRONIZACIÓN EN SEGUNDO PLANO
        // =================================================================
        const payloadPOS = {
          ...baseData,
          code: "auto",
          cufe: "Pendiente...",
          sync_mode: "async"
        };
        console.log("Guardando en POS (Asíncrono 5 min):", payloadPOS);

        // Guardar directamente en base local sin esperar a Siigo
        const resPOS = await axiosInstance.post(`/posinnovate/siigo/sale/invoice/pos`, payloadPOS);
        toast.success("Venta guardada en POS. Se sincronizará con Siigo en segundo plano.");

        return resPOS?.data;
      }
    } catch (error) {
      console.error("Error al facturar:", error);
      const isTimeout = error?.code === 504 || 
                        error?.code === 'ECONNABORTED' || 
                        error?.message?.toLowerCase()?.includes('timeout') ||
                        error?.message?.toLowerCase()?.includes('demoró');

      let errorMsg = error?.message || error?.response?.data?.message || "Error al procesar la factura";
      if (isTimeout) {
        errorMsg = "⚠️ Siigo demoró mucho en su respuesta, la factura puede haberse hecho. Por seguridad el POS no la guardará, verifica en Siigo y aplica nota de crédito antes de intentar.";
      }
      toast.error(errorMsg, { duration: 15000 });
    } finally {
      setLoading(false);
    }
  };

  return { isLoading, POST_InvoiceSiigo };
}
