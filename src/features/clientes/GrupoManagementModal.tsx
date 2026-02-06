import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Users, Plus, Trash2, Crown, Search, UserPlus, X } from "lucide-react";
import type { Database } from "@/lib/supabase";

type ClienteRow = Database['public']['Tables']['clientes']['Row'];

interface Grupo {
  id: string;
  nombre: string;
  lider_id: string;
  created_at: string;
}

interface GrupoManagementModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: ClienteRow | null;
  allClientes: ClienteRow[];
  onGrupoUpdated?: () => void;
}

export function GrupoManagementModal({
  isOpen,
  onOpenChange,
  cliente,
  allClientes,
  onGrupoUpdated,
}: GrupoManagementModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [miembros, setMiembros] = useState<ClienteRow[]>([]);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Cargar datos del grupo al abrir
  useEffect(() => {
    if (isOpen && cliente) {
      fetchGrupoData();
    }
  }, [isOpen, cliente]);

  const fetchGrupoData = async () => {
    if (!cliente) return;

    setLoading(true);
    try {
      // Verificar si el cliente es líder de algún grupo
      const { data: grupoLider, error: errorLider } = await supabase
        .from("grupos")
        .select("*")
        .eq("lider_id", cliente.id)
        .maybeSingle();

      if (errorLider) throw errorLider;

      if (grupoLider) {
        setGrupo(grupoLider);
        // Cargar miembros del grupo
        const { data: miembrosData, error: errorMiembros } = await supabase
          .from("clientes")
          .select("*")
          .eq("grupo_id", grupoLider.id);

        if (errorMiembros) throw errorMiembros;
        setMiembros(miembrosData || []);
      } else {
        // Ver si es miembro de algún grupo
        if ((cliente as any).grupo_id) {
          const { data: grupoMiembro, error: errorGrupo } = await supabase
            .from("grupos")
            .select("*")
            .eq("id", (cliente as any).grupo_id)
            .single();

          if (!errorGrupo && grupoMiembro) {
            setGrupo(grupoMiembro);
            // Cargar otros miembros del grupo
            const { data: miembrosData } = await supabase
              .from("clientes")
              .select("*")
              .eq("grupo_id", grupoMiembro.id);
            setMiembros(miembrosData || []);
          }
        } else {
          setGrupo(null);
          setMiembros([]);
        }
      }
    } catch (err) {
      console.error("Error cargando grupo:", err);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información del grupo" });
    } finally {
      setLoading(false);
    }
  };

  const handleCrearGrupo = async () => {
    if (!cliente || !nombreGrupo.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Ingresa un nombre para el grupo" });
      return;
    }

    setLoading(true);
    try {
      // Crear el grupo
      const { data: nuevoGrupo, error: errorGrupo } = await supabase
        .from("grupos")
        .insert({ nombre: nombreGrupo.trim(), lider_id: cliente.id })
        .select()
        .single();

      if (errorGrupo) throw errorGrupo;

      // Asignar grupo_id al líder
      const { error: errorUpdate } = await supabase
        .from("clientes")
        .update({ grupo_id: nuevoGrupo.id } as any)
        .eq("id", cliente.id);

      if (errorUpdate) throw errorUpdate;

      toast({ title: "Grupo creado", description: `El grupo "${nombreGrupo}" ha sido creado correctamente` });
      setGrupo(nuevoGrupo);
      setMiembros([{ ...cliente, grupo_id: nuevoGrupo.id } as any]);
      setNombreGrupo("");
      setIsCreating(false);
      onGrupoUpdated?.();
    } catch (err) {
      console.error("Error creando grupo:", err);
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el grupo" });
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarMiembro = async (nuevoMiembro: ClienteRow) => {
    if (!grupo) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ grupo_id: grupo.id } as any)
        .eq("id", nuevoMiembro.id);

      if (error) throw error;

      toast({ title: "Miembro agregado", description: `${nuevoMiembro.nombre} ha sido agregado al grupo` });
      setMiembros([...miembros, { ...nuevoMiembro, grupo_id: grupo.id } as any]);
      setSearchQuery("");
      setIsAddingMember(false);
      onGrupoUpdated?.();
    } catch (err) {
      console.error("Error agregando miembro:", err);
      toast({ variant: "destructive", title: "Error", description: "No se pudo agregar el miembro" });
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarMiembro = async (miembroId: string) => {
    if (!grupo) return;

    // No se puede eliminar al líder
    if (miembroId === grupo.lider_id) {
      toast({ variant: "destructive", title: "Error", description: "No puedes eliminar al líder del grupo" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ grupo_id: null } as any)
        .eq("id", miembroId);

      if (error) throw error;

      toast({ title: "Miembro eliminado", description: "El miembro ha sido removido del grupo" });
      setMiembros(miembros.filter((m) => m.id !== miembroId));
      onGrupoUpdated?.();
    } catch (err) {
      console.error("Error eliminando miembro:", err);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el miembro" });
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarGrupo = async () => {
    if (!grupo) return;

    setLoading(true);
    try {
      // Primero quitar grupo_id de todos los miembros
      const { error: errorMiembros } = await supabase
        .from("clientes")
        .update({ grupo_id: null } as any)
        .eq("grupo_id", grupo.id);

      if (errorMiembros) throw errorMiembros;

      // Luego eliminar el grupo
      const { error: errorGrupo } = await supabase
        .from("grupos")
        .delete()
        .eq("id", grupo.id);

      if (errorGrupo) throw errorGrupo;

      toast({ title: "Grupo eliminado", description: "El grupo ha sido eliminado correctamente" });
      setGrupo(null);
      setMiembros([]);
      onGrupoUpdated?.();
    } catch (err) {
      console.error("Error eliminando grupo:", err);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el grupo" });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes disponibles para agregar (no deben estar en ningún grupo)
  const clientesDisponibles = allClientes.filter(
    (c) =>
      c.id !== cliente?.id &&
      !(c as any).grupo_id &&
      c.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLider = grupo && cliente && grupo.lider_id === cliente.id;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Grupo
          </DialogTitle>
          <DialogDescription>
            {cliente?.nombre} - {grupo ? grupo.nombre : "Sin grupo"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !grupo ? (
          // No tiene grupo - Opción de crear
          <div className="space-y-4">
            {isCreating ? (
              <div className="space-y-3">
                <Label htmlFor="nombreGrupo">Nombre del Grupo</Label>
                <Input
                  id="nombreGrupo"
                  placeholder="Ej: Familia Pérez"
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCrearGrupo} disabled={loading}>
                    Crear Grupo
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">Este cliente no pertenece a ningún grupo.</p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Grupo como Líder
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Tiene grupo - Mostrar miembros
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{grupo.nombre}</h4>
                <p className="text-sm text-muted-foreground">{miembros.length} miembro(s)</p>
              </div>
              {isLider && (
                <Button variant="destructive" size="sm" onClick={handleEliminarGrupo}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar Grupo
                </Button>
              )}
            </div>

            <Separator />

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {miembros.map((miembro) => (
                  <div
                    key={miembro.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={miembro.avatar_url || undefined} />
                        <AvatarFallback>{miembro.nombre.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{miembro.nombre}</span>
                          {miembro.id === grupo.lider_id && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Líder
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{miembro.nombre_membresia || "Sin membresía"}</span>
                      </div>
                    </div>
                    {isLider && miembro.id !== grupo.lider_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminarMiembro(miembro.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {isLider && (
              <>
                <Separator />
                {isAddingMember ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-[150px]">
                      {clientesDisponibles.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No hay clientes disponibles</p>
                      ) : (
                        <div className="space-y-1">
                          {clientesDisponibles.slice(0, 10).map((c) => (
                            <Button
                              key={c.id}
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => handleAgregarMiembro(c)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {c.nombre}
                            </Button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <Button variant="outline" onClick={() => setIsAddingMember(false)} className="w-full">
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setIsAddingMember(true)} className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar Miembro
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
