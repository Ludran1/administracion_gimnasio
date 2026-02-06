
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { ClientesTable } from "@/features/clientes/ClientesTable";
import { ClienteForm } from "@/features/clientes/ClienteForm";
import { ClienteEditForm } from "@/features/clientes/ClienteEditForm";
import { RenovarMembresiaModal } from "@/features/clientes/RenovarMembresiaModal";
import { GrupoManagementModal } from "@/features/clientes/GrupoManagementModal";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useClientes } from "@/features/clientes/useClientes";
import type { Database } from "@/lib/supabase";

type ClienteRow = Database['public']['Tables']['clientes']['Row'];

export default function Clientes() {
  const {
    filteredClientes,
    busqueda,
    setBusqueda,
    isDialogOpen,
    setIsDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    clienteActual,
    handleEdit,
    handleDelete,
    confirmDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    onSubmit,
    handleAddNew,
    membresiasDisponibles,
    saveCliente,
    fetchClientes,
  } = useClientes();

  // Estado para el modal de renovación
  const [isRenovarOpen, setIsRenovarOpen] = useState(false);
  const [clienteARenovar, setClienteARenovar] = useState<ClienteRow | null>(null);

  // Estado para el modal de grupo
  const [isGrupoOpen, setIsGrupoOpen] = useState(false);
  const [clienteParaGrupo, setClienteParaGrupo] = useState<ClienteRow | null>(null);

  const handleRenovar = (cliente: ClienteRow) => {
    setClienteARenovar(cliente);
    setIsRenovarOpen(true);
  };

  const handleRenovacionExitosa = () => {
    // Recargar la lista de clientes
    fetchClientes();
  };

  const handleGrupo = (cliente: ClienteRow) => {
    setClienteParaGrupo(cliente);
    setIsGrupoOpen(true);
  };

  const handleEditSubmit = async (values: any) => {
    await saveCliente(values, { closeDialog: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Gestión de Clientes</h2>
        <Button onClick={handleAddNew} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <ClientesTable
        clientes={filteredClientes}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRenovar={handleRenovar}
        onGrupo={handleGrupo}
      />

      {/* Modal para CREAR nuevo cliente */}
      <ClienteForm
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={onSubmit}
        clienteActual={null}
        membresiasDisponibles={membresiasDisponibles}
        saveCliente={saveCliente}
      />

      {/* Modal para EDITAR cliente existente */}
      {clienteActual && (
        <ClienteEditForm
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={handleEditSubmit}
          cliente={clienteActual}
          membresiasDisponibles={membresiasDisponibles}
        />
      )}

      {/* Modal para RENOVAR membresía */}
      <RenovarMembresiaModal
        isOpen={isRenovarOpen}
        onOpenChange={setIsRenovarOpen}
        cliente={clienteARenovar}
        membresiasDisponibles={membresiasDisponibles}
        onRenovacionExitosa={handleRenovacionExitosa}
      />

      {/* Modal para GESTIÓN DE GRUPO */}
      <GrupoManagementModal
        isOpen={isGrupoOpen}
        onOpenChange={setIsGrupoOpen}
        cliente={clienteParaGrupo}
        allClientes={filteredClientes}
        onGrupoUpdated={() => fetchClientes()}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar cliente?"
        description="Esta acción no se puede deshacer. El cliente será eliminado permanentemente del sistema."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
}

