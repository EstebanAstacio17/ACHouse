"use client";

import { useState, useEffect } from "react";
import {
  X,
  Calculator,
  Layers,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Percent,
  Pencil,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { formatMoney } from "@/lib/geo";
import { useSafeBackdropClose } from "@/lib/useSafeBackdropClose";
import {
  getCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  seedDefaultCatalog,
  getQuotes,
  createQuote,
  recordQuotePayment,
  deleteQuote,
} from "@/lib/actions/quotes-catalog";
import type { BusinessCatalogItem, BusinessQuote, QuoteTemplateType } from "@achouse/types";

interface BusinessQuoterModalProps {
  business: {
    id: string;
    name: string;
    type: string;
    currency: string;
  };
  accountsList: Array<{ id: string; name: string; currency?: string }>;
  availableMembers: Array<{ id: string; displayName: string; role: string }>;
  onClose: () => void;
  onRefresh?: () => void;
}

export function BusinessQuoterModal({
  business,
  accountsList,
  availableMembers,
  onClose,
  onRefresh,
}: BusinessQuoterModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"quoter" | "catalog" | "history">("quoter");

  // Determine specific business domain
  const bizUpper = business.name.toUpperCase();
  const is3D = bizUpper.includes("AIMPRIMIR3D");
  const isCopies = bizUpper.includes("COPIA");
  const isPortaForza = bizUpper.includes("PORTAFORZA");
  const isEsencia = bizUpper.includes("ESENCIA");
  const isAsTeje = bizUpper.includes("AS TEJE");

  // Lock template strictly to this business to avoid cross-business confusion
  const templateType: QuoteTemplateType = is3D
    ? "3d_print"
    : isCopies
    ? "copy_service"
    : "hourly";

  const quoterModelTitle = is3D
    ? "Impresión 3D (Costo Filamento + Slicer + Desgaste + Mano de Obra)"
    : isCopies
    ? "Centro de Copias (Copias B/N, Color & Insumos)"
    : isPortaForza
    ? "Desarrollo de Software, Proyectos & Horas de Ingeniería"
    : isEsencia
    ? "Eventos, Decoración & Productos Personalizados"
    : isAsTeje
    ? "Servicios Técnicos, Reparaciones & Mantenimiento"
    : "Servicios Profesionales / Facturación por Horas";

  // ── 3D Print Calculator State (Matches exact Excel Formula) ──────────────────
  const [spoolCost, setSpoolCost] = useState<number>(1951.0); // 1220 + 681 + 50
  const [spoolGrams, setSpoolGrams] = useState<number>(1000.0);
  const [partGrams, setPartGrams] = useState<number>(55.0);

  const [printDays, setPrintDays] = useState<number>(0);
  const [printHours, setPrintHours] = useState<number>(2);
  const [printMinutes, setPrintMinutes] = useState<number>(51);

  const [machineWatts, setMachineWatts] = useState<number>(200.0);
  const [electricityKwhRate, setElectricityKwhRate] = useState<number>(9.0);

  const [machineCost, setMachineCost] = useState<number>(33000.0);
  const [machineLifespanHours, setMachineLifespanHours] = useState<number>(2000.0);

  const [hourlyLaborRate, setHourlyLaborRate] = useState<number>(325.0);
  const [manualHours, setManualHours] = useState<number>(1.0);

  const [addonsAmount, setAddonsAmount] = useState<number>(90.0);
  const [mermaPercent, setMermaPercent] = useState<number>(15.0); // 0.15
  const [riskPercent, setRiskPercent] = useState<number>(15.0); // 0.15
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(100.0); // 1.00

  // ── Copy Service Calculator State ───────────────────────────────────────────
  const [bwCopies, setBwCopies] = useState<number>(100);
  const [bwUnitCost, setBwUnitCost] = useState<number>(1.5);
  const [bwUnitPrice, setBwUnitPrice] = useState<number>(5.0);

  const [colorCopies, setColorCopies] = useState<number>(20);
  const [colorUnitCost, setColorUnitCost] = useState<number>(5.0);
  const [colorUnitPrice, setColorUnitPrice] = useState<number>(15.0);

  // ── PortaForza / Software State ──────────────────────────────────────────────
  const [devHours, setDevHours] = useState<number>(20);
  const [hourlyDevCost, setHourlyDevCost] = useState<number>(600);
  const [hourlyDevPrice, setHourlyDevPrice] = useState<number>(1500);
  const [infraCost, setInfraCost] = useState<number>(0);
  const [softwareRiskPercent, setSoftwareRiskPercent] = useState<number>(10);

  // ── Esencia / Eventos State ──────────────────────────────────────────────────
  const [decorMaterialsCost, setDecorMaterialsCost] = useState<number>(1500);
  const [decorPackagingCost, setDecorPackagingCost] = useState<number>(300);
  const [decorLaborHours, setDecorLaborHours] = useState<number>(4);
  const [decorLaborRate, setDecorLaborRate] = useState<number>(300);
  const [decorTransportCost, setDecorTransportCost] = useState<number>(200);
  const [decorMermaPercent, setDecorMermaPercent] = useState<number>(10);
  const [decorMarginPercent, setDecorMarginPercent] = useState<number>(100);

  // ── AS Teje / Técnico State ─────────────────────────────────────────────────
  const [techPartsCost, setTechPartsCost] = useState<number>(1000);
  const [techLaborHours, setTechLaborHours] = useState<number>(3);
  const [techLaborRate, setTechLaborRate] = useState<number>(400);
  const [techTransportCost, setTechTransportCost] = useState<number>(300);
  const [techRiskPercent, setTechRiskPercent] = useState<number>(10);
  const [techMarginPercent, setTechMarginPercent] = useState<number>(60);

  // ── Hourly / Professional Service Calculator State ──────────────────────────
  const [serviceHours, setServiceHours] = useState<number>(10);
  const [hourlyServiceCost, setHourlyServiceCost] = useState<number>(600);
  const [hourlyServicePrice, setHourlyServicePrice] = useState<number>(1200);

  // ── Catalog Inline Editing State ────────────────────────────────────────────
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemType, setEditItemType] = useState<"material" | "labor" | "energy" | "machine" | "service" | "addon">("material");
  const [editItemUnit, setEditItemUnit] = useState("");
  const [editItemCost, setEditItemCost] = useState<number>(0);
  const [editItemPrice, setEditItemPrice] = useState<number | undefined>(undefined);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);

  // ── Quote General Metadata ──────────────────────────────────────────────────
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("2 a 3 días laborables");
  const [paymentMethod, setPaymentMethod] = useState("Transferencia");
  const [selectedAccountId, setSelectedAccountId] = useState(accountsList[0]?.id || "");
  const [selectedMemberId, setSelectedMemberId] = useState(availableMembers[0]?.id || "");
  const [paymentInitialState, setPaymentInitialState] = useState<"quote" | "pending" | "partial" | "paid">("quote");
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // ── Catalog & Quotes Lists ──────────────────────────────────────────────────
  const [catalogItems, setCatalogItems] = useState<BusinessCatalogItem[]>([]);
  const [quotesList, setQuotesList] = useState<BusinessQuote[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  // ── Payment Dialog for Existing Quotes ──────────────────────────────────────
  const [payingQuote, setPayingQuote] = useState<BusinessQuote | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payAccountId, setPayAccountId] = useState(accountsList[0]?.id || "");
  const [payNotes, setPayNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // ── New Catalog Item Form ───────────────────────────────────────────────────
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"material" | "labor" | "energy" | "machine" | "service" | "addon">("material");
  const [newCatUnit, setNewCatUnit] = useState("unidad");
  const [newCatCost, setNewCatCost] = useState<number>(0);
  const [newCatPrice, setNewCatPrice] = useState<number | undefined>(undefined);

  // Load Catalog and Quotes
  const refreshCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const items = await getCatalogItems(business.id);
      setCatalogItems(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const refreshQuotes = async () => {
    setIsLoadingQuotes(true);
    try {
      const quotes = await getQuotes(business.id);
      setQuotesList(quotes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  useEffect(() => {
    refreshCatalog();
    refreshQuotes();
  }, [business.id]);

  useEffect(() => {
    if (!selectedAccountId && accountsList && accountsList.length > 0) {
      setSelectedAccountId(accountsList[0].id);
    }
  }, [accountsList, selectedAccountId]);

  useEffect(() => {
    if (!selectedMemberId && availableMembers && availableMembers.length > 0) {
      setSelectedMemberId(availableMembers[0].id);
    }
  }, [availableMembers, selectedMemberId]);

  // Synchronize quoter defaults from catalog items whenever catalog loads or is updated
  useEffect(() => {
    if (!catalogItems || catalogItems.length === 0) return;

    if (is3D) {
      const filItem = catalogItems.find(i => i.itemType === "material" && i.name.toLowerCase().includes("filamento"));
      if (filItem) setSpoolCost(parseFloat(filItem.unitCost) || 1951);

      const energyItem = catalogItems.find(i => i.itemType === "energy");
      if (energyItem) setElectricityKwhRate(parseFloat(energyItem.unitCost) || 9);

      const laborItem = catalogItems.find(i => i.itemType === "labor");
      if (laborItem) setHourlyLaborRate(parseFloat(laborItem.unitCost) || 325);

      const addonItem = catalogItems.find(i => i.itemType === "addon");
      if (addonItem) setAddonsAmount(parseFloat(addonItem.unitCost) || 90);
    } else if (isCopies) {
      const bwItem = catalogItems.find(i => i.name.toLowerCase().includes("b/n") || i.name.toLowerCase().includes("negro"));
      if (bwItem) {
        setBwUnitCost(parseFloat(bwItem.unitCost) || 1.5);
        if (bwItem.defaultPrice) setBwUnitPrice(parseFloat(bwItem.defaultPrice));
      }
      const colorItem = catalogItems.find(i => i.name.toLowerCase().includes("color"));
      if (colorItem) {
        setColorUnitCost(parseFloat(colorItem.unitCost) || 5);
        if (colorItem.defaultPrice) setColorUnitPrice(parseFloat(colorItem.defaultPrice));
      }
    } else if (isPortaForza) {
      const devItem = catalogItems.find(i => i.itemType === "labor" || i.itemType === "service");
      if (devItem) {
        setHourlyDevCost(parseFloat(devItem.unitCost) || 600);
        if (devItem.defaultPrice) setHourlyDevPrice(parseFloat(devItem.defaultPrice));
      }
    } else if (isEsencia) {
      const laborItem = catalogItems.find(i => i.itemType === "labor");
      if (laborItem) setDecorLaborRate(parseFloat(laborItem.unitCost) || 300);
      const matItem = catalogItems.find(i => i.itemType === "material");
      if (matItem) setDecorMaterialsCost(parseFloat(matItem.unitCost) || 1500);
    } else if (isAsTeje) {
      const techItem = catalogItems.find(i => i.itemType === "labor");
      if (techItem) setTechLaborRate(parseFloat(techItem.unitCost) || 400);
      const partItem = catalogItems.find(i => i.itemType === "material");
      if (partItem) setTechPartsCost(parseFloat(partItem.unitCost) || 1000);
    } else {
      const laborItem = catalogItems.find(i => i.itemType === "labor" || i.itemType === "service");
      if (laborItem) {
        setHourlyServiceCost(parseFloat(laborItem.unitCost) || 600);
        if (laborItem.defaultPrice) setHourlyServicePrice(parseFloat(laborItem.defaultPrice));
      }
    }
  }, [catalogItems, is3D, isCopies, isPortaForza, isEsencia, isAsTeje]);

  // Catalog Inline Editing Methods
  const startEditItem = (item: BusinessCatalogItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemType(item.itemType as any);
    setEditItemUnit(item.unit);
    setEditItemCost(parseFloat(item.unitCost) || 0);
    setEditItemPrice(item.defaultPrice ? parseFloat(item.defaultPrice) : undefined);
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
  };

  const handleSaveEditItem = async (id: string) => {
    if (!editItemName.trim()) {
      toast.error("El nombre del insumo no puede estar vacío");
      return;
    }
    setIsUpdatingItem(true);
    try {
      await updateCatalogItem(id, {
        name: editItemName.trim(),
        itemType: editItemType,
        unit: editItemUnit.trim(),
        unitCost: editItemCost,
        defaultPrice: editItemPrice,
        currency: business.currency || "DOP",
        isActive: true,
      });
      toast.success("Insumo actualizado exitosamente");
      setEditingItemId(null);
      await refreshCatalog();
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar el insumo");
    } finally {
      setIsUpdatingItem(false);
    }
  };

  const backdropProps = useSafeBackdropClose(onClose);

  // ── 3D Printing Math Calculations ───────────────────────────────────────────
  const totalPrintHours = printDays * 24 + printHours + printMinutes / 60;
  const filamentSubtotal = spoolGrams > 0 ? (spoolCost / spoolGrams) * partGrams : 0;
  const energySubtotal = totalPrintHours * (machineWatts / 1000) * electricityKwhRate;
  const wearSubtotal = machineLifespanHours > 0 ? (machineCost / machineLifespanHours) * totalPrintHours : 0;
  const laborSubtotal = hourlyLaborRate * manualHours;
  const baseSubtotal3D = filamentSubtotal + energySubtotal + wearSubtotal + laborSubtotal;

  const mermaAmount = baseSubtotal3D * (mermaPercent / 100);
  const riskAmount = baseSubtotal3D * (riskPercent / 100);
  const profitAmount3D = baseSubtotal3D * (profitMarginPercent / 100);

  const totalCalculated3D =
    baseSubtotal3D + addonsAmount + mermaAmount + riskAmount + profitAmount3D;

  // ── Copies Math Calculations ────────────────────────────────────────────────
  const bwCostTotal = bwCopies * bwUnitCost;
  const bwSalesTotal = bwCopies * bwUnitPrice;
  const colorCostTotal = colorCopies * colorUnitCost;
  const colorSalesTotal = colorCopies * colorUnitPrice;
  const totalCalculatedCopies = bwSalesTotal + colorSalesTotal;
  const copiesBaseCost = bwCostTotal + colorCostTotal;
  const copiesProfit = totalCalculatedCopies - copiesBaseCost;

  // ── PortaForza Math Calculations ────────────────────────────────────────────
  const devLaborCost = devHours * hourlyDevCost;
  const devSalesTotal = devHours * hourlyDevPrice;
  const softwareBase = devLaborCost + infraCost;
  const softwareRisk = softwareBase * (softwareRiskPercent / 100);
  const softwareProfit = devSalesTotal - devLaborCost;
  const softwareTotalAmount = devSalesTotal + infraCost + softwareRisk;

  // ── Esencia Math Calculations ───────────────────────────────────────────────
  const decorLaborCost = decorLaborHours * decorLaborRate;
  const decorBase = decorMaterialsCost + decorPackagingCost + decorTransportCost + decorLaborCost;
  const decorMerma = decorBase * (decorMermaPercent / 100);
  const decorProfit = decorBase * (decorMarginPercent / 100);
  const decorTotalAmount = decorBase + decorMerma + decorProfit;

  // ── AS Teje Servicios Math Calculations ─────────────────────────────────────
  const techLaborCost = techLaborHours * techLaborRate;
  const techBase = techPartsCost + techLaborCost + techTransportCost;
  const techRisk = techBase * (techRiskPercent / 100);
  const techProfit = techBase * (techMarginPercent / 100);
  const techTotalAmount = techBase + techRisk + techProfit;

  // ── Hourly / Professional Math Calculations ─────────────────────────────────
  const serviceCostTotal = serviceHours * hourlyServiceCost;
  const serviceSalesTotal = serviceHours * hourlyServicePrice;
  const totalCalculatedHourly = serviceSalesTotal;
  const hourlyProfit = serviceSalesTotal - serviceCostTotal;

  // Consolidated Results based on active template
  let finalMaterialTotal = 0;
  let finalEnergyTotal = 0;
  let finalWearRiskTotal = 0;
  let finalLaborTotal = 0;
  let finalOverheadTotal = 0;
  let finalProfitTotal = 0;
  let finalTotalAmount = 0;

  if (is3D) {
    finalMaterialTotal = filamentSubtotal;
    finalEnergyTotal = energySubtotal;
    finalWearRiskTotal = wearSubtotal + riskAmount;
    finalLaborTotal = laborSubtotal;
    finalOverheadTotal = addonsAmount + mermaAmount;
    finalProfitTotal = profitAmount3D;
    finalTotalAmount = totalCalculated3D;
  } else if (isCopies) {
    finalMaterialTotal = copiesBaseCost;
    finalEnergyTotal = 0;
    finalWearRiskTotal = 0;
    finalLaborTotal = 0;
    finalOverheadTotal = 0;
    finalProfitTotal = copiesProfit;
    finalTotalAmount = totalCalculatedCopies;
  } else if (isPortaForza) {
    finalMaterialTotal = infraCost;
    finalEnergyTotal = 0;
    finalWearRiskTotal = softwareRisk;
    finalLaborTotal = devLaborCost;
    finalOverheadTotal = 0;
    finalProfitTotal = softwareProfit;
    finalTotalAmount = softwareTotalAmount;
  } else if (isEsencia) {
    finalMaterialTotal = decorMaterialsCost + decorPackagingCost;
    finalEnergyTotal = 0;
    finalWearRiskTotal = decorTransportCost + decorMerma;
    finalLaborTotal = decorLaborCost;
    finalOverheadTotal = 0;
    finalProfitTotal = decorProfit;
    finalTotalAmount = decorTotalAmount;
  } else if (isAsTeje) {
    finalMaterialTotal = techPartsCost;
    finalEnergyTotal = 0;
    finalWearRiskTotal = techTransportCost + techRisk;
    finalLaborTotal = techLaborCost;
    finalOverheadTotal = 0;
    finalProfitTotal = techProfit;
    finalTotalAmount = techTotalAmount;
  } else {
    finalMaterialTotal = 0;
    finalEnergyTotal = 0;
    finalWearRiskTotal = 0;
    finalLaborTotal = serviceCostTotal;
    finalOverheadTotal = 0;
    finalProfitTotal = hourlyProfit;
    finalTotalAmount = totalCalculatedHourly;
  }

  // Handle Save Quote
  const handleSaveQuote = async () => {
    if (!clientName.trim() || !title.trim()) {
      toast.error("Por favor completa el nombre del cliente y el título de la cotización");
      return;
    }

    if (finalTotalAmount <= 0) {
      toast.error("El monto total de la cotización debe ser mayor a cero");
      return;
    }

    setIsSaving(true);
    try {
      let paidAmt = 0;
      let pct = 0;

      if (paymentInitialState === "paid") {
        paidAmt = finalTotalAmount;
        pct = 100;
      } else if (paymentInitialState === "partial") {
        paidAmt = customPaidAmount > 0 ? customPaidAmount : finalTotalAmount * 0.5;
        pct = (paidAmt / finalTotalAmount) * 100;
      }

      const lineItems = is3D
        ? {
            spoolCost,
            spoolGrams,
            partGrams,
            filamentSubtotal,
            totalPrintHours,
            machineWatts,
            electricityKwhRate,
            energySubtotal,
            machineCost,
            machineLifespanHours,
            wearSubtotal,
            hourlyLaborRate,
            manualHours,
            laborSubtotal,
            baseSubtotal: baseSubtotal3D,
            addonsAmount,
            mermaPercent,
            mermaAmount,
            riskPercent,
            riskAmount,
            profitMarginPercent,
            profitAmount: profitAmount3D,
          }
        : isCopies
        ? {
            bwCopies,
            bwUnitCost,
            bwUnitPrice,
            colorCopies,
            colorUnitCost,
            colorUnitPrice,
            copiesBaseCost,
            copiesProfit,
          }
        : isPortaForza
        ? {
            devHours,
            hourlyDevCost,
            hourlyDevPrice,
            infraCost,
            softwareRiskPercent,
            devLaborCost,
            softwareRisk,
            softwareProfit,
          }
        : isEsencia
        ? {
            decorMaterialsCost,
            decorPackagingCost,
            decorLaborHours,
            decorLaborRate,
            decorTransportCost,
            decorMermaPercent,
            decorMarginPercent,
            decorLaborCost,
            decorMerma,
            decorProfit,
          }
        : isAsTeje
        ? {
            techPartsCost,
            techLaborHours,
            techLaborRate,
            techTransportCost,
            techRiskPercent,
            techMarginPercent,
            techLaborCost,
            techRisk,
            techProfit,
          }
        : {
            serviceHours,
            hourlyServiceCost,
            hourlyServicePrice,
            serviceCostTotal,
            hourlyProfit,
          };

      await createQuote({
        businessId: business.id,
        memberId: selectedMemberId || undefined,
        accountId: selectedAccountId || undefined,
        clientName: clientName.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        templateType,
        deliveryTime: deliveryTime.trim() || undefined,
        paymentMethod: paymentMethod.trim() || undefined,
        currency: business.currency || "DOP",
        lineItems,
        materialTotal: finalMaterialTotal,
        energyTotal: finalEnergyTotal,
        wearRiskTotal: finalWearRiskTotal,
        laborTotal: finalLaborTotal,
        overheadTotal: finalOverheadTotal,
        profitTotal: finalProfitTotal,
        totalAmount: finalTotalAmount,
        paymentStatus: paymentInitialState,
        paidPercentage: pct,
        paidAmount: paidAmt,
        remainingAmount: Math.max(0, finalTotalAmount - paidAmt),
      });

      toast.success("¡Cotización guardada exitosamente!");
      setClientName("");
      setTitle("");
      setDescription("");
      await refreshQuotes();
      if (onRefresh) onRefresh();
      setActiveTab("history");
    } catch (e: any) {
      toast.error(e.message || "Error al guardar la cotización");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Recording Payment on an existing quote
  const handleExecutePayment = async () => {
    if (!payingQuote || payAmount <= 0) return;
    setIsSubmittingPayment(true);
    try {
      await recordQuotePayment(payingQuote.id, {
        amount: payAmount,
        accountId: payAccountId,
        notes: payNotes.trim() || undefined,
      });

      toast.success("Cobro registrado y distribuido a bolsillos correctamente");
      setPayingQuote(null);
      setPayAmount(0);
      setPayNotes("");
      await refreshQuotes();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Error al registrar el cobro");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle Add Catalog Item
  const handleAddCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await createCatalogItem({
        businessId: business.id,
        name: newCatName.trim(),
        itemType: newCatType,
        unit: newCatUnit.trim(),
        unitCost: newCatCost,
        defaultPrice: newCatPrice,
        currency: business.currency || "DOP",
        isActive: true,
      });

      toast.success("Ítem añadido al catálogo");
      setNewCatName("");
      setNewCatCost(0);
      setNewCatPrice(undefined);
      await refreshCatalog();
    } catch (e: any) {
      toast.error(e.message || "Error al añadir ítem");
    }
  };

  // Handle Restore Catalog Seeds
  const handleRestoreDefaults = async () => {
    try {
      await seedDefaultCatalog(business.id, business.name);
      toast.success("Catálogo predeterminado inicializado");
      await refreshCatalog();
    } catch (e: any) {
      toast.error(e.message || "Error al inicializar catálogo");
    }
  };

  const fmt = (n: number | string) => formatMoney(n, business.currency || "DOP");

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      {...backdropProps}
    >
      <div
        className="modal"
        style={{
          maxWidth: 960,
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "var(--bg-card-alt)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--accent-subtle)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              <Calculator size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
                Cotizador & Catálogo: {business.name}
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                Desglose inteligente de insumos, costos fijos, mano de obra y cobros parciales
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "0 1.5rem",
            background: "var(--bg-card)",
          }}
        >
          <button
            onClick={() => setActiveTab("quoter")}
            style={{
              padding: "0.875rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === "quoter" ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === "quoter" ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <Calculator size={16} /> Calculadora / Cotizador
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            style={{
              padding: "0.875rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === "catalog" ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === "catalog" ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <Layers size={16} /> Catálogo de Insumos ({catalogItems.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              padding: "0.875rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === "history" ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === "history" ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <History size={16} /> Historial & Cobros ({quotesList.length})
          </button>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {/* TAB 1: QUOTER / CALCULATOR */}
          {activeTab === "quoter" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Business-Locked Specialized Banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--surface-2)",
                  padding: "0.875rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Sparkles size={18} color="var(--accent)" />
                  <div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {quoterModelTitle}
                    </span>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Cotizador especializado de {business.name}. Los costos se sincronizan con su propio catálogo.
                    </span>
                  </div>
                </div>
                <span className="badge badge-investment" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                  {business.name}
                </span>
              </div>

              {/* Template 1: 3D PRINTING (EXACT AIMPRIMIR3D FORMULA) */}
              {is3D && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  {/* Filamento & Slicer Inputs */}
                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--accent)" }}>1. Filamento (Insumo)</span>
                      <span className="badge badge-investment">{fmt(filamentSubtotal)}</span>
                    </div>
                    <div className="form-group">
                      <label className="label">Costo Rollo PLA 1kg (RD$ con Courier y Envío)</label>
                      <input
                        type="number"
                        className="input"
                        value={spoolCost}
                        onChange={e => setSpoolCost(parseFloat(e.target.value) || 0)}
                      />
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Base: 1,220 + Courier: 681 + Tamayo: 50 = RD$ 1,951
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div className="form-group">
                        <label className="label">Peso Rollo (g)</label>
                        <input
                          type="number"
                          className="input"
                          value={spoolGrams}
                          onChange={e => setSpoolGrams(parseFloat(e.target.value) || 1000)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Peso Pieza (g - Slicer)</label>
                        <input
                          type="number"
                          className="input"
                          value={partGrams}
                          onChange={e => setPartGrams(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tiempo de Impresión & Energía */}
                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-warning)" }}>2. Tiempo & Electricidad</span>
                      <span className="badge badge-warning">{fmt(energySubtotal)}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.35rem" }}>
                      <div className="form-group">
                        <label className="label">Días</label>
                        <input
                          type="number"
                          className="input"
                          value={printDays}
                          onChange={e => setPrintDays(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Horas</label>
                        <input
                          type="number"
                          className="input"
                          value={printHours}
                          onChange={e => setPrintHours(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Minutos</label>
                        <input
                          type="number"
                          className="input"
                          value={printMinutes}
                          onChange={e => setPrintMinutes(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div className="form-group">
                        <label className="label">Consumo (W)</label>
                        <input
                          type="number"
                          className="input"
                          value={machineWatts}
                          onChange={e => setMachineWatts(parseFloat(e.target.value) || 200)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Tarifa (RD$/kWh)</label>
                        <input
                          type="number"
                          className="input"
                          value={electricityKwhRate}
                          onChange={e => setElectricityKwhRate(parseFloat(e.target.value) || 9)}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      Tiempo total: {totalPrintHours.toFixed(2)}h
                    </span>
                  </div>

                  {/* Desgaste Máquina */}
                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-expense)" }}>3. Desgaste Máquina</span>
                      <span className="badge badge-expense">{fmt(wearSubtotal)}</span>
                    </div>
                    <div className="form-group">
                      <label className="label">Inversión Máquina (RD$)</label>
                      <input
                        type="number"
                        className="input"
                        value={machineCost}
                        onChange={e => setMachineCost(parseFloat(e.target.value) || 33000)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Vida Útil Estimada (Horas)</label>
                      <input
                        type="number"
                        className="input"
                        value={machineLifespanHours}
                        onChange={e => setMachineLifespanHours(parseFloat(e.target.value) || 2000)}
                      />
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Costo/Hora: {(machineCost / machineLifespanHours).toFixed(2)} RD$/h
                      </span>
                    </div>
                  </div>

                  {/* Mano de Obra */}
                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-income)" }}>4. Mano de Obra</span>
                      <span className="badge badge-income">{fmt(laborSubtotal)}</span>
                    </div>
                    <div className="form-group">
                      <label className="label">Sueldo / Valor Hora (RD$)</label>
                      <input
                        type="number"
                        className="input"
                        value={hourlyLaborRate}
                        onChange={e => setHourlyLaborRate(parseFloat(e.target.value) || 325)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Tiempo Manual (Horas - Laminado & Post)</label>
                      <input
                        type="number"
                        step="0.25"
                        className="input"
                        value={manualHours}
                        onChange={e => setManualHours(parseFloat(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  {/* Márgenes, Riesgo y Adicionales */}
                  <div className="card" style={{ gridColumn: "1 / -1", padding: "1rem", background: "var(--bg-card-alt)" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--accent)" }}>5. Adicionales, Merma & Margen de Ganancia</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "0.75rem" }}>
                      <div className="form-group">
                        <label className="label">Adicionales (Empaque / Llaverito)</label>
                        <input
                          type="number"
                          className="input"
                          value={addonsAmount}
                          onChange={e => setAddonsAmount(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Merma / Purgas (% Base)</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="number"
                            className="input"
                            value={mermaPercent}
                            onChange={e => setMermaPercent(parseFloat(e.target.value) || 0)}
                          />
                          <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{fmt(mermaAmount)}</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="label">% Riesgo (% Base)</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="number"
                            className="input"
                            value={riskPercent}
                            onChange={e => setRiskPercent(parseFloat(e.target.value) || 0)}
                          />
                          <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{fmt(riskAmount)}</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="label">Margen Ganancia (% Base)</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="number"
                            className="input"
                            value={profitMarginPercent}
                            onChange={e => setProfitMarginPercent(parseFloat(e.target.value) || 0)}
                          />
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-income)" }}>{fmt(profitAmount3D)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Template 2: COPY SERVICE (COPIAS) */}
              {isCopies && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
                  <div className="card" style={{ padding: "1rem" }}>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>Copias Blanco y Negro</h4>
                    <div className="form-group">
                      <label className="label">Cantidad de Páginas</label>
                      <input type="number" className="input" value={bwCopies} onChange={e => setBwCopies(parseInt(e.target.value) || 0)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div className="form-group">
                        <label className="label">Costo Insumo (RD$)</label>
                        <input type="number" step="0.25" className="input" value={bwUnitCost} onChange={e => setBwUnitCost(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="label">Precio Venta (RD$)</label>
                        <input type="number" step="0.5" className="input" value={bwUnitPrice} onChange={e => setBwUnitPrice(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      Subtotal: <strong>{fmt(bwSalesTotal)}</strong> (Costo: {fmt(bwCostTotal)})
                    </div>
                  </div>

                  <div className="card" style={{ padding: "1rem" }}>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>Copias a Color</h4>
                    <div className="form-group">
                      <label className="label">Cantidad de Páginas</label>
                      <input type="number" className="input" value={colorCopies} onChange={e => setColorCopies(parseInt(e.target.value) || 0)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div className="form-group">
                        <label className="label">Costo Insumo (RD$)</label>
                        <input type="number" step="0.5" className="input" value={colorUnitCost} onChange={e => setColorUnitCost(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="label">Precio Venta (RD$)</label>
                        <input type="number" step="1" className="input" value={colorUnitPrice} onChange={e => setColorUnitPrice(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      Subtotal: <strong>{fmt(colorSalesTotal)}</strong> (Costo: {fmt(colorCostTotal)})
                    </div>
                  </div>
                </div>
              )}

              {/* Template 3: PORTAFORZA (SOFTWARE & PROYECTOS) */}
              {isPortaForza && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--accent)" }}>1. Horas de Desarrollo & Arquitectura</span>
                    <div className="form-group">
                      <label className="label">Horas Estimadas de Trabajo</label>
                      <input type="number" className="input" value={devHours} onChange={e => setDevHours(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div className="form-group">
                        <label className="label">Costo Interno/h (RD$)</label>
                        <input type="number" className="input" value={hourlyDevCost} onChange={e => setHourlyDevCost(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="label">Tarifa Cliente/h (RD$)</label>
                        <input type="number" className="input" value={hourlyDevPrice} onChange={e => setHourlyDevPrice(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-warning)" }}>2. Infraestructura & Servidores / APIs</span>
                    <div className="form-group">
                      <label className="label">Costo Directo Servidores / Licencias (RD$)</label>
                      <input type="number" className="input" value={infraCost} onChange={e => setInfraCost(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                      <label className="label">% Contingencia / Riesgo Técnico</label>
                      <input type="number" className="input" value={softwareRiskPercent} onChange={e => setSoftwareRiskPercent(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Template 4: ESENCIA (EVENTOS, DECORACIÓN & PRODUCTOS) */}
              {isEsencia && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-income)" }}>1. Insumos de Decoración & Materiales</span>
                    <div className="form-group">
                      <label className="label">Costo de Materiales / Flores / Globos (RD$)</label>
                      <input type="number" className="input" value={decorMaterialsCost} onChange={e => setDecorMaterialsCost(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                      <label className="label">Empaque / Envolturas / Cintas (RD$)</label>
                      <input type="number" className="input" value={decorPackagingCost} onChange={e => setDecorPackagingCost(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>

                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--accent)" }}>2. Montaje & Tiempo de Dedicación</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div className="form-group">
                        <label className="label">Horas Montaje</label>
                        <input type="number" className="input" value={decorLaborHours} onChange={e => setDecorLaborHours(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="label">Valor/Hora (RD$)</label>
                        <input type="number" className="input" value={decorLaborRate} onChange={e => setDecorLaborRate(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="label">Transporte / Envíos (RD$)</label>
                      <input type="number" className="input" value={decorTransportCost} onChange={e => setDecorTransportCost(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>

                  <div className="card" style={{ gridColumn: "1 / -1", padding: "1rem", background: "var(--bg-card-alt)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="form-group">
                        <label className="label">% Merma / Desperdicio</label>
                        <input type="number" className="input" value={decorMermaPercent} onChange={e => setDecorMermaPercent(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="label">Margen de Ganancia (%)</label>
                        <input type="number" className="input" value={decorMarginPercent} onChange={e => setDecorMarginPercent(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Template 5: AS TEJE SERVICIOS (SERVICIOS TÉCNICOS & REPARACIONES) */}
              {isAsTeje && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--accent)" }}>1. Mano de Obra Técnica</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div className="form-group">
                        <label className="label">Horas Técnicas</label>
                        <input type="number" className="input" value={techLaborHours} onChange={e => setTechLaborHours(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="label">Tarifa/Hora (RD$)</label>
                        <input type="number" className="input" value={techLaborRate} onChange={e => setTechLaborRate(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-warning)" }}>2. Repuestos & Transporte</span>
                    <div className="form-group">
                      <label className="label">Costo Repuestos / Materiales (RD$)</label>
                      <input type="number" className="input" value={techPartsCost} onChange={e => setTechPartsCost(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                      <label className="label">Transporte / Viáticos (RD$)</label>
                      <input type="number" className="input" value={techTransportCost} onChange={e => setTechTransportCost(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>

                  <div className="card" style={{ gridColumn: "1 / -1", padding: "1rem", background: "var(--bg-card-alt)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="form-group">
                        <label className="label">% Riesgo / Fondo de Garantía</label>
                        <input type="number" className="input" value={techRiskPercent} onChange={e => setTechRiskPercent(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="label">Margen de Ganancia (%)</label>
                        <input type="number" className="input" value={techMarginPercent} onChange={e => setTechMarginPercent(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Template 6: SERVICIOS PROFESIONALES / HORAS (DEFAULT & INDEPENDIENTE) */}
              {!is3D && !isCopies && !isPortaForza && !isEsencia && !isAsTeje && (
                <div className="card" style={{ padding: "1.25rem" }}>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>Horas Profesionales / Consultoría / Desarrollo</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="label">Horas Estimadas</label>
                      <input type="number" className="input" value={serviceHours} onChange={e => setServiceHours(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                      <label className="label">Costo Base / Hora (RD$)</label>
                      <input type="number" className="input" value={hourlyServiceCost} onChange={e => setHourlyServiceCost(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                      <label className="label">Tarifa Cliente / Hora (RD$)</label>
                      <input type="number" className="input" value={hourlyServicePrice} onChange={e => setHourlyServicePrice(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE SUMMARY / BREAKDOWN POCKETS PREVIEW */}
              <div
                style={{
                  background: "var(--accent-subtle)",
                  border: "1px solid var(--accent)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
                      Resumen y Bolsillos Contables (Pockets)
                    </span>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0.25rem 0 0 0" }}>
                      Total Estimado: {fmt(finalTotalAmount)}
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)", fontWeight: 700 }}>
                      Insumos: {fmt(finalMaterialTotal)}
                    </span>
                    <span className="badge" style={{ background: "rgba(234,179,8,0.15)", color: "var(--color-warning)", fontWeight: 700 }}>
                      Energía: {fmt(finalEnergyTotal)}
                    </span>
                    <span className="badge" style={{ background: "rgba(239,68,68,0.15)", color: "var(--color-expense)", fontWeight: 700 }}>
                      Desgaste/Riesgo: {fmt(finalWearRiskTotal)}
                    </span>
                    <span className="badge" style={{ background: "rgba(16,185,129,0.15)", color: "var(--color-income)", fontWeight: 700 }}>
                      Mano de Obra: {fmt(finalLaborTotal)}
                    </span>
                    <span className="badge" style={{ background: "rgba(16,185,129,0.25)", color: "var(--color-income)", fontWeight: 800 }}>
                      Ganancia Neta: {fmt(finalProfitTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* QUOTE RECIPIENT & PAYMENT DESTINATION FORM */}
              <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>Datos de la Cotización y Cobro</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="label">Nombre del Cliente *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. Juan Pérez / Empresa X"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Título del Trabajo / Pedido *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. 30 Llaveros en PLA con Argolla"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Tiempo de Entrega</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. 2 a 3 días hábiles"
                      value={deliveryTime}
                      onChange={e => setDeliveryTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Método de Pago Acordado</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. Transferencia BanReservas / Efectivo"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="label">Cuenta de Depósito / Caja</label>
                    <select
                      className="input"
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                    >
                      {accountsList.length === 0 ? (
                        <option value="">(Sin cuentas registradas)</option>
                      ) : (
                        accountsList.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.currency || "DOP"})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Miembro que Cotiza / Gestiona</label>
                    <select
                      className="input"
                      value={selectedMemberId}
                      onChange={e => setSelectedMemberId(e.target.value)}
                    >
                      {availableMembers.length === 0 ? (
                        <option value="">(Sin miembros)</option>
                      ) : (
                        availableMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.displayName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Estado Inicial del Cobro</label>
                    <select
                      className="input"
                      value={paymentInitialState}
                      onChange={e => setPaymentInitialState(e.target.value as any)}
                    >
                      <option value="quote">Solo Cotización (0% cobrado, no afecta balance)</option>
                      <option value="pending">Por Cobrar (Pendiente de cobro al cliente)</option>
                      <option value="partial">Cobro Parcial / Anticipo (Registra abono)</option>
                      <option value="paid">Pagado Completo (100% cobrado y acreditado)</option>
                    </select>
                  </div>
                </div>

                {paymentInitialState === "partial" && (
                  <div
                    style={{
                      background: "var(--surface-2)",
                      padding: "0.875rem",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }} className="form-group">
                      <label className="label">Monto Abonado Inicial (RD$)</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="Ej. 600"
                        value={customPaidAmount || ""}
                        onChange={e => setCustomPaidAmount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      Resta por cobrar:{" "}
                      <strong style={{ color: "var(--color-warning)" }}>
                        {fmt(Math.max(0, finalTotalAmount - customPaidAmount))}
                      </strong>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                    Cerrar
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveQuote} disabled={isSaving}>
                    <Save size={16} /> {isSaving ? "Guardando..." : "Guardar Cotización"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CATALOG MANAGEMENT */}
          {activeTab === "catalog" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                    Parámetros e Insumos Configurados
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                    Valores predeterminados que alimentan el cotizador automático
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleRestoreDefaults}>
                  <RotateCcw size={14} /> Restaurar Catálogo por Defecto
                </button>
              </div>

              {/* Add New Item Form */}
              <form onSubmit={handleAddCatalogItem} className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>Añadir Nuevo Insumo / Parámetro al Catálogo</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="label">Nombre del Ítem *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. Resma de Hojas"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Tipo de Concepto</label>
                    <select
                      className="input"
                      value={newCatType}
                      onChange={e => setNewCatType(e.target.value as any)}
                    >
                      <option value="material">Material / Insumo</option>
                      <option value="energy">Consumo Eléctrico</option>
                      <option value="machine">Desgaste de Equipo</option>
                      <option value="labor">Mano de Obra</option>
                      <option value="service">Servicio</option>
                      <option value="addon">Adicional / Empaque</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Unidad de Medida</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. gramos, horas, rollo"
                      value={newCatUnit}
                      onChange={e => setNewCatUnit(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Costo Unitario (RD$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={newCatCost}
                      onChange={e => setNewCatCost(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Precio Venta Opcional (RD$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="Opcional"
                      value={newCatPrice ?? ""}
                      onChange={e => setNewCatPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Plus size={14} /> Añadir al Catálogo
                  </button>
                </div>
              </form>

              {/* Catalog Items Table */}
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="table" style={{ width: "100%", margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Unidad</th>
                      <th style={{ textAlign: "right" }}>Costo Unitario</th>
                      <th style={{ textAlign: "right" }}>Precio Venta</th>
                      <th style={{ textAlign: "center" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                          No hay ítems configurados. Haz clic en "Restaurar Catálogo por Defecto".
                        </td>
                      </tr>
                    ) : (
                      catalogItems.map(item => {
                        const isEditing = editingItemId === item.id;
                        if (isEditing) {
                          return (
                            <tr key={item.id} style={{ background: "var(--surface-2)" }}>
                              <td>
                                <input
                                  type="text"
                                  className="input"
                                  style={{ fontSize: "0.8125rem", padding: "0.3rem 0.5rem" }}
                                  value={editItemName}
                                  onChange={e => setEditItemName(e.target.value)}
                                  placeholder="Nombre del insumo"
                                  required
                                />
                              </td>
                              <td>
                                <select
                                  className="input"
                                  style={{ fontSize: "0.8125rem", padding: "0.3rem 0.5rem" }}
                                  value={editItemType}
                                  onChange={e => setEditItemType(e.target.value as any)}
                                >
                                  <option value="material">material</option>
                                  <option value="energy">energy</option>
                                  <option value="machine">machine</option>
                                  <option value="labor">labor</option>
                                  <option value="service">service</option>
                                  <option value="addon">addon</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="input"
                                  style={{ fontSize: "0.8125rem", padding: "0.3rem 0.5rem", width: 80 }}
                                  value={editItemUnit}
                                  onChange={e => setEditItemUnit(e.target.value)}
                                  placeholder="Unidad"
                                  required
                                />
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="input"
                                  style={{ fontSize: "0.8125rem", padding: "0.3rem 0.5rem", width: 110, textAlign: "right" }}
                                  value={editItemCost}
                                  onChange={e => setEditItemCost(parseFloat(e.target.value) || 0)}
                                  required
                                />
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="input"
                                  style={{ fontSize: "0.8125rem", padding: "0.3rem 0.5rem", width: 110, textAlign: "right" }}
                                  placeholder="Opcional"
                                  value={editItemPrice ?? ""}
                                  onChange={e => setEditItemPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                                    onClick={() => handleSaveEditItem(item.id)}
                                    disabled={isUpdatingItem}
                                    title="Guardar cambios"
                                  >
                                    <Check size={12} /> {isUpdatingItem ? "..." : "OK"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: "0.25rem 0.4rem" }}
                                    onClick={cancelEditItem}
                                    title="Cancelar"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                            <td>
                              <span className="badge badge-investment" style={{ fontSize: "0.7rem" }}>
                                {item.itemType}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-secondary)" }}>{item.unit}</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(item.unitCost)}</td>
                            <td style={{ textAlign: "right", color: item.defaultPrice ? "var(--color-income)" : "var(--text-muted)" }}>
                              {item.defaultPrice ? fmt(item.defaultPrice) : "—"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center" }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-icon btn-sm"
                                  style={{ color: "var(--accent)" }}
                                  onClick={() => startEditItem(item)}
                                  title="Editar insumo o costo"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-icon btn-sm"
                                  style={{ color: "var(--color-expense)" }}
                                  onClick={async () => {
                                    if (confirm(`¿Eliminar el insumo "${item.name}"?`)) {
                                      await deleteCatalogItem(item.id);
                                      toast.success("Ítem eliminado");
                                      await refreshCatalog();
                                    }
                                  }}
                                  title="Eliminar insumo"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: QUOTES HISTORY & PAYMENT TRACKING */}
          {activeTab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                  Cotizaciones Emitidas & Cobros
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                  Control de pagos parciales, saldos pendientes y acreditación a cuentas
                </p>
              </div>

              {/* Quotes Cards / Table */}
              {quotesList.length === 0 ? (
                <div className="card empty-state" style={{ padding: "2.5rem" }}>
                  <History size={36} style={{ color: "var(--text-muted)", margin: "0 auto 0.75rem auto" }} />
                  <p className="empty-state-title">No hay cotizaciones para este negocio</p>
                  <p className="empty-state-desc">Usa la pestaña "Calculadora" para generar tu primera cotización.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  {quotesList.map(q => {
                    const total = parseFloat(q.totalAmount || "0");
                    const paid = parseFloat(q.paidAmount || "0");
                    const remaining = parseFloat(q.remainingAmount || "0");
                    const pct = total > 0 ? (paid / total) * 100 : 0;

                    let badgeColor = "var(--text-muted)";
                    let statusLabel = "Cotización";
                    if (q.paymentStatus === "paid") {
                      badgeColor = "var(--color-income)";
                      statusLabel = "Pagado 100%";
                    } else if (q.paymentStatus === "partial") {
                      badgeColor = "var(--accent)";
                      statusLabel = `Abonado (${pct.toFixed(0)}%)`;
                    } else if (q.paymentStatus === "pending") {
                      badgeColor = "var(--color-warning)";
                      statusLabel = "Por Cobrar";
                    }

                    return (
                      <div
                        key={q.id}
                        className="card"
                        style={{
                          padding: "1rem 1.25rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>{q.title}</h4>
                              <span
                                className="badge"
                                style={{
                                  fontSize: "0.6875rem",
                                  background: "var(--surface-2)",
                                  color: badgeColor,
                                  border: `1px solid ${badgeColor}`,
                                  fontWeight: 700,
                                }}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "0.25rem 0 0 0" }}>
                              Cliente: <strong>{q.clientName}</strong> • {new Date(q.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "1.125rem", fontWeight: 800 }}>{fmt(total)}</span>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Cobrado: {fmt(paid)} | Restante: {fmt(remaining)}
                            </div>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div style={{ width: "100%", height: 6, background: "var(--bg-hover)", borderRadius: 999, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: pct >= 100 ? "var(--color-income)" : "var(--accent)",
                              borderRadius: 999,
                            }}
                          />
                        </div>

                        {/* Pocket tags */}
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          <span>Insumos: {fmt(q.materialTotal)}</span> •
                          <span>Energía: {fmt(q.energyTotal)}</span> •
                          <span>Desgaste: {fmt(q.wearRiskTotal)}</span> •
                          <span>Mano de Obra: {fmt(q.laborTotal)}</span> •
                          <span style={{ color: "var(--color-income)", fontWeight: 700 }}>
                            Ganancia: {fmt(q.profitTotal)}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
                          {remaining > 0.01 && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setPayingQuote(q);
                                setPayAmount(remaining);
                              }}
                            >
                              <DollarSign size={14} /> Registrar Cobro / Abono
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: "var(--color-expense)" }}
                            onClick={async () => {
                              await deleteQuote(q.id);
                              toast.success("Cotización eliminada");
                              refreshQuotes();
                              if (onRefresh) onRefresh();
                            }}
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Inline Dialog to Record Payment on Quote */}
        {payingQuote && (
          <div
            className="overlay"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110 }}
          >
            <div className="modal" style={{ maxWidth: 440 }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Registrar Cobro de Cotización</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                    "{payingQuote.title}" — {payingQuote.clientName}
                  </p>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPayingQuote(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Monto a Cobrar / Abonar (RD$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={payAmount || ""}
                    onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Saldo restante total: {fmt(payingQuote.remainingAmount)}
                  </span>
                </div>

                <div className="form-group">
                  <label className="label">Cuenta de Destino *</label>
                  <select
                    className="input"
                    value={payAccountId}
                    onChange={e => setPayAccountId(e.target.value)}
                    required
                  >
                    {accountsList.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency || "DOP"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Notas / Referencia (Opcional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej. Transferencia recibida por WhatsApp"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                  />
                </div>

                <div style={{ background: "var(--surface-2)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  <p style={{ margin: 0, lineHeight: 1.4 }}>
                    💡 Al confirmar, el sistema acreditará el dinero a la cuenta seleccionada y repartirá automáticamente el monto en los bolsillos de <strong>Insumos, Energía, Desgaste y Ganancia</strong>.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPayingQuote(null)} disabled={isSubmittingPayment}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleExecutePayment} disabled={isSubmittingPayment}>
                  <CheckCircle2 size={15} /> {isSubmittingPayment ? "Procesando..." : "Confirmar Cobro"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
