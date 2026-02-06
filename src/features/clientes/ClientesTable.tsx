import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Edit, Trash2, Calendar, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Database } from "@/lib/supabase";
import { useMembershipExpiration } from "@/hooks/useMembershipExpiration";
import { formatISODate } from "@/lib/utils";
import { ClientDetailsModal } from "./ClientDetailsModal";

type ClienteRow = Database['public']['Tables']['clientes']['Row'];

interface ClientesTableProps {
  clientes: ClienteRow[];
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  onEdit: (cliente: ClienteRow) => void;
  onDelete: (id: string) => void;
  onRenovar?: (cliente: ClienteRow) => void;
  onGrupo?: (cliente: ClienteRow) => void;
}

export function ClientesTable({
  clientes,
  busqueda,
  onBusquedaChange,
  onEdit,
  onDelete,
  onRenovar,
  onGrupo,
}: ClientesTableProps) {
  const { getMembershipStatus, getStatusColor, getStatusText } = useMembershipExpiration();
  const [page, setPage] = useState(1);
  const [selectedClientDetails, setSelectedClientDetails] = useState<ClienteRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(clientes.length / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const visibles = clientes.slice(start, end);

  useEffect(() => { setPage(1); }, [busqueda, clientes.length]);

  const handleOpenDetails = (cliente: ClienteRow) => {
    setSelectedClientDetails(cliente);
    setIsDetailsOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes Registrados</CardTitle>
        <CardDescription>
          Administra los datos de los clientes del gimnasio
        </CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            className="pl-8"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Vista de tabla para pantallas grandes */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Membresía</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.length === 0 ? (
                <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                visibles.map((cliente) => {
                  const status = getMembershipStatus(cliente.fecha_fin, cliente.membresia_id);
                  return (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div 
                        className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleOpenDetails(cliente)}
                        title="Ver detalles"
                      >
                        <Avatar>
                          <AvatarFallback>
                            {cliente.nombre.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{cliente.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {cliente.dni || 'Sin DNI'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{cliente.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {cliente.telefono}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cliente.nombre_membresia || 'Sin membresía'}</p>
                        {cliente.tipo_membresia && (
                          <p className="text-xs text-muted-foreground capitalize">{cliente.tipo_membresia}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={status === 'activa' ? 'default' : status === 'por_vencer' ? 'destructive' : 'secondary'}
                          className={`${getStatusColor(status)} flex items-center space-x-1`}
                        >
                          {status === 'por_vencer' && <AlertTriangle className="h-3 w-3" />}
                          {status === 'activa' && <Calendar className="h-3 w-3" />}
                          <span>{getStatusText(status)}</span>
                        </Badge>
                        {cliente.fecha_fin && status !== 'inactiva' && (
                          <span className="text-xs text-muted-foreground">
                            {formatISODate(cliente.fecha_fin)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {onRenovar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRenovar(cliente)}
                            title="Renovar membresía"
                          >
                            <RefreshCw className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {onGrupo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onGrupo(cliente)}
                            title="Gestionar grupo"
                          >
                            <Users className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(cliente)}
                          title="Editar cliente"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(cliente.id)}
                          title="Eliminar cliente"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>

        {/* Vista de tarjetas para pantallas pequeñas */}
        <div className="md:hidden space-y-4">
          {visibles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron clientes
            </div>
          ) : (
            visibles.map((cliente) => {
              const status = getMembershipStatus(cliente.fecha_fin, cliente.membresia_id);
              return (
                <Card key={cliente.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer"
                      onClick={() => handleOpenDetails(cliente)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {cliente.nombre.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{cliente.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {cliente.dni || 'Sin DNI'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {onRenovar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRenovar(cliente)}
                        >
                          <RefreshCw className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {onGrupo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGrupo(cliente)}
                        >
                          <Users className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(cliente)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(cliente.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email:</p>
                      <p className="break-all">{cliente.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Teléfono:</p>
                      <p>{cliente.telefono}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="default" className="text-xs">
                        {cliente.nombre_membresia || 'Sin membresía'}
                      </Badge>
                      <Badge 
                        variant={status === 'activa' ? 'default' : status === 'por_vencer' ? 'destructive' : 'secondary'}
                        className={`${getStatusColor(status)} flex items-center space-x-1 text-xs`}
                      >
                        {status === 'por_vencer' && <AlertTriangle className="h-3 w-3" />}
                        {status === 'activa' && <Calendar className="h-3 w-3" />}
                        <span>{getStatusText(status)}</span>
                      </Badge>
                    </div>
                    {cliente.fecha_fin && status !== 'inactiva' && (
                      <div className="pt-1">
                        <p className="text-xs text-muted-foreground">
                          Vence: {formatISODate(cliente.fecha_fin)}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
      <div className="flex items-center justify-end gap-2 px-6 pb-4">
        <span className="text-xs text-muted-foreground mr-auto">Mostrando {visibles.length} de {clientes.length}</span>
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">{page} / {totalPages}</span>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <ClientDetailsModal 
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        cliente={selectedClientDetails}
      />
    </Card>
  );
}
