import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Users, CreditCard, Wallet, Percent, Crown } from "lucide-react";
import { format, addMonths, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/lib/supabase";

type ClienteRow = Database['public']['Tables']['clientes']['Row'];

interface Membresia {
  id: string;
  nombre: string;
  precio: number;
  tipo: string;
  modalidad: string;
  duracion?: number;
}

interface Grupo {
  id: string;
  nombre: string;
  lider_id: string;
}

interface RenovarMembresiaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: ClienteRow | null;
  membresiasDisponibles: Membresia[];
  onRenovacionExitosa: () => void;
}

export function RenovarMembresiaModal({
  isOpen,
  onOpenChange,
  cliente,
  membresiasDisponibles,
  onRenovacionExitosa
}: RenovarMembresiaModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Estados del formulario
  const [membresiaId, setMembresiaId] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [fechaFin, setFechaFin] = useState<string>("");
  
  // Estados de pago
  const [pagoEnCuotas, setPagoEnCuotas] = useState(false);
  const [montoAdelanto, setMontoAdelanto] = useState<number>(0);
  const [numCuotas, setNumCuotas] = useState<number>(1);
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");

  // Estados de grupo
  const [grupoData, setGrupoData] = useState<Grupo | null>(null);
  const [miembrosGrupo, setMiembrosGrupo] = useState<ClienteRow[]>([]);
  const [modoGrupal, setModoGrupal] = useState(false);
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState<string[]>([]);

  // Membresía seleccionada
  const membresiaSeleccionada = membresiasDisponibles.find(m => m.id === membresiaId);
  const precioMembresia = membresiaSeleccionada?.precio || 0;
  
  // Cálculo de descuento grupal (solo para membresías mensuales)
  const esMembresiaMensual = membresiaSeleccionada?.modalidad?.toLowerCase().includes("mensual") || 
                             membresiaSeleccionada?.tipo?.toLowerCase().includes("mensual");
  
  const calcularDescuento = (numMiembros: number): number => {
    if (!esMembresiaMensual) return 0;
    if (numMiembros >= 4) return 0.16; // 16%
    if (numMiembros === 3) return 0.12; // 12%
    if (numMiembros === 2) return 0.08; // 8%
    return 0;
  };

  const numMiembrosActivos = miembrosSeleccionados.length;
  const descuento = modoGrupal ? calcularDescuento(numMiembrosActivos) : 0;
  const subtotal = modoGrupal ? precioMembresia * numMiembrosActivos : precioMembresia;
  const montoDescuento = subtotal * descuento;
  const totalFinal = subtotal - montoDescuento;
  const saldoPendiente = totalFinal - montoAdelanto;

  // Cargar datos del grupo al abrir
  const fetchGrupoData = useCallback(async () => {
    if (!cliente) return;

    try {
      // Verificar si el cliente es líder de algún grupo
      const { data: grupoLider, error: errorLider } = await supabase
        .from("grupos")
        .select("*")
        .eq("lider_id", cliente.id)
        .maybeSingle();

      if (errorLider) {
        console.error("Error fetching grupo:", errorLider);
        return;
      }

      if (grupoLider) {
        setGrupoData(grupoLider as Grupo);
        // Cargar miembros del grupo
        const { data: miembrosData } = await supabase
          .from("clientes")
          .select("*")
          .eq("grupo_id", grupoLider.id);

        if (miembrosData) {
          setMiembrosGrupo(miembrosData);
          // Seleccionar todos por defecto
          setMiembrosSeleccionados(miembrosData.map(m => m.id));
        }
      } else {
        setGrupoData(null);
        setMiembrosGrupo([]);
        setModoGrupal(false);
      }
    } catch (err) {
      console.error("Error cargando grupo:", err);
    }
  }, [cliente]);

  // Resetear formulario cuando se abre
  useEffect(() => {
    if (isOpen && cliente) {
      setMembresiaId(cliente.membresia_id || "");
      setFechaInicio(format(new Date(), "yyyy-MM-dd"));
      setPagoEnCuotas(false);
      setMontoAdelanto(0);
      setNumCuotas(1);
      setMetodoPago("efectivo");
      setModoGrupal(false);
      fetchGrupoData();
    }
  }, [isOpen, cliente, fetchGrupoData]);

  // Calcular fecha de vencimiento automáticamente
  useEffect(() => {
    if (membresiaSeleccionada && membresiaSeleccionada.duracion && fechaInicio) {
      const fecha = addMonths(new Date(fechaInicio), membresiaSeleccionada.duracion);
      setFechaFin(format(fecha, "yyyy-MM-dd"));
    }
  }, [membresiaId, fechaInicio, membresiaSeleccionada]);

  // Resetear cuotas cuando cambia membresía
  useEffect(() => {
    setMontoAdelanto(0);
    setPagoEnCuotas(false);
  }, [membresiaId]);

  const toggleMiembro = (miembroId: string) => {
    setMiembrosSeleccionados(prev => 
      prev.includes(miembroId) 
        ? prev.filter(id => id !== miembroId)
        : [...prev, miembroId]
    );
  };

  const handleRenovar = async () => {
    if (!cliente || !membresiaSeleccionada) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona una membresía"
      });
      return;
    }

    if (modoGrupal && miembrosSeleccionados.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona al menos un miembro del grupo"
      });
      return;
    }

    setLoading(true);
    try {
      const clientesARenovar = modoGrupal 
        ? miembrosGrupo.filter(m => miembrosSeleccionados.includes(m.id))
        : [cliente];

      // 1. Actualizar todos los clientes con nueva membresía
      for (const c of clientesARenovar) {
        const { error: clienteError } = await supabase
          .from('clientes')
          .update({
            membresia_id: membresiaId,
            nombre_membresia: membresiaSeleccionada.nombre,
            tipo_membresia: membresiaSeleccionada.modalidad,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            estado: 'activa'
          })
          .eq('id', c.id);

        if (clienteError) throw clienteError;
      }

      // 2. Crear UN SOLO registro de pago (a nombre del líder/cliente)
      const notasDescuento = descuento > 0 
        ? `Descuento Grupal ${(descuento * 100).toFixed(0)}% aplicado (${numMiembrosActivos} miembros)`
        : modoGrupal 
          ? `Renovación Grupal (${numMiembrosActivos} miembros)`
          : 'Renovación de membresía';

      const montoInicial = pagoEnCuotas ? montoAdelanto : totalFinal;
      
      const { data: pagoData, error: pagoError } = await supabase
        .from('pagos')
        .insert({
          cliente_id: cliente.id,
          membresia_id: membresiaId,
          monto_total: totalFinal,
          monto_pagado: montoInicial,
          nombre_membresia: membresiaSeleccionada.nombre,
          num_cuotas: pagoEnCuotas ? numCuotas : 0,
          estado: pagoEnCuotas && saldoPendiente > 0 ? 'parcial' : 'pagado',
          notas: notasDescuento
        })
        .select()
        .single();

      if (pagoError) {
        console.error('Error al crear pago:', pagoError);
      } else if (pagoData && montoInicial > 0) {
        // 3. Crear transacción inicial
        await supabase
          .from('transacciones')
          .insert({
            pago_id: pagoData.id,
            cliente_id: cliente.id,
            monto: montoInicial,
            tipo: pagoEnCuotas ? 'adelanto' : 'pago_completo',
            metodo_pago: metodoPago,
            notas: notasDescuento
          });
      }

      toast({
        title: modoGrupal ? "Grupo renovado" : "Membresía renovada",
        description: modoGrupal 
          ? `Se renovaron ${clientesARenovar.length} membresías. Total: S/ ${totalFinal.toFixed(2)}`
          : `La membresía de ${cliente.nombre} ha sido renovada correctamente.`
      });

      onRenovacionExitosa();
      onOpenChange(false);

    } catch (error: unknown) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo renovar la membresía"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!cliente) return null;

  const isLider = grupoData && grupoData.lider_id === cliente.id;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5 rounded-t-lg">
          <DialogHeader className="items-center text-center text-white">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-2">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Renovar Membresía
            </DialogTitle>
            <DialogDescription className="text-white/80">
              {cliente.nombre}
              {isLider && (
                <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                  <Crown className="h-3 w-3 mr-1" />
                  Líder de Grupo
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Modo Grupal Toggle (solo si es líder) */}
          {isLider && miembrosGrupo.length > 1 && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <Label className="font-medium text-blue-900 dark:text-blue-100">Renovación Grupal</Label>
                </div>
                <Switch
                  checked={modoGrupal}
                  onCheckedChange={setModoGrupal}
                />
              </div>

              {modoGrupal && (
                <>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Selecciona los miembros a renovar:
                  </p>
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-2">
                      {miembrosGrupo.map((miembro) => (
                        <div 
                          key={miembro.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-blue-100/50 dark:hover:bg-blue-900/50"
                        >
                          <Checkbox
                            id={`miembro-${miembro.id}`}
                            checked={miembrosSeleccionados.includes(miembro.id)}
                            onCheckedChange={() => toggleMiembro(miembro.id)}
                          />
                          <label 
                            htmlFor={`miembro-${miembro.id}`}
                            className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                          >
                            {miembro.nombre}
                            {miembro.id === grupoData?.lider_id && (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            )}
                          </label>
                          <span className="text-xs text-muted-foreground">
                            {miembro.nombre_membresia || "Sin plan"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {descuento > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-green-700 dark:text-green-400">
                      <Percent className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Descuento del {(descuento * 100).toFixed(0)}% aplicado ({numMiembrosActivos} miembros)
                      </span>
                    </div>
                  )}
                  {!esMembresiaMensual && numMiembrosActivos >= 2 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ El descuento grupal solo aplica para membresías mensuales.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Info actual */}
          {!modoGrupal && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Membresía actual</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{cliente.nombre_membresia || 'Sin membresía'}</p>
                  <p className="text-xs text-muted-foreground">
                    {cliente.fecha_fin ? `Vence: ${format(new Date(cliente.fecha_fin), 'dd/MM/yyyy')}` : 'Sin fecha de vencimiento'}
                  </p>
                </div>
                <Badge variant={cliente.estado === 'activa' ? 'default' : 'destructive'}>
                  {cliente.estado === 'activa' ? 'Activa' : cliente.estado === 'vencida' ? 'Vencida' : cliente.estado}
                </Badge>
              </div>
            </div>
          )}

          {/* Nueva membresía */}
          <div>
            <Label className="text-sm font-medium">
              {modoGrupal ? "Membresía para el grupo" : "Nueva membresía"}
            </Label>
            <Select value={membresiaId} onValueChange={setMembresiaId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecciona una membresía" />
              </SelectTrigger>
              <SelectContent>
                {membresiasDisponibles.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{m.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.tipo} • {m.modalidad} • S/ {m.precio}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Fecha inicio</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha vencimiento</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Sección de pago */}
          {membresiaSeleccionada && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              {/* Resumen de precio */}
              <div className="space-y-2 text-sm">
                {modoGrupal && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {numMiembrosActivos} x S/ {precioMembresia.toFixed(2)}
                      </span>
                      <span>S/ {subtotal.toFixed(2)}</span>
                    </div>
                    {descuento > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Descuento ({(descuento * 100).toFixed(0)}%)</span>
                        <span>- S/ {montoDescuento.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                  </>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>Total a pagar:</span>
                  <span className="text-lg">S/ {totalFinal.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <Label className="font-medium">Pago en cuotas</Label>
                </div>
                <Switch
                  checked={pagoEnCuotas}
                  onCheckedChange={setPagoEnCuotas}
                />
              </div>

              {pagoEnCuotas && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Saldo pendiente</Label>
                      <div className="text-lg font-bold text-orange-600">
                        S/ {saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Monto de adelanto (S/)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalFinal}
                      value={montoAdelanto}
                      onChange={(e) => setMontoAdelanto(Math.min(parseFloat(e.target.value) || 0, totalFinal))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Número de cuotas (máx. 2)</Label>
                    <Select value={String(numCuotas)} onValueChange={(v) => setNumCuotas(Number(v))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 cuota</SelectItem>
                        <SelectItem value="2">2 cuotas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {saldoPendiente > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Plan de cuotas semanales:</p>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                        {Array.from({ length: numCuotas }, (_, i) => {
                          const montoCuota = saldoPendiente / numCuotas;
                          const fechaCuota = addDays(new Date(), (i + 1) * 7);
                          return (
                            <li key={i} className="flex justify-between">
                              <span>Cuota {i + 1} - {format(fechaCuota, 'dd/MM/yyyy')}</span>
                              <span className="font-medium">S/ {montoCuota.toFixed(2)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-sm">Método de pago</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="yape">Yape</SelectItem>
                    <SelectItem value="plin">Plin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleRenovar} 
            disabled={loading || !membresiaId || (modoGrupal && miembrosSeleccionados.length === 0)}
            className="bg-gradient-to-r from-green-600 to-emerald-500"
          >
            {loading ? "Renovando..." : modoGrupal ? `Renovar ${numMiembrosActivos} Membresías` : "Renovar Membresía"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
