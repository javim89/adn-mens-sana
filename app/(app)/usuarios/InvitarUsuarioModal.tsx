'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { invitarUsuario } from '@/lib/actions/usuarios';
import { ROLES_PERMITIDOS, ROL_LABELS } from '@/lib/roles';
import { CustomSelect } from '@/app/components/ui/custom-select';

const schema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().min(1, 'El email es requerido').email('El email no es válido'),
  // Derivado de ROLES_PERMITIDOS para que nunca se desincronice al agregar un rol nuevo.
  rol: z.enum(ROLES_PERMITIDOS, {
    error: 'Seleccioná un rol',
  }),
});

type FormData = z.infer<typeof schema>;

interface InvitarUsuarioModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvitarUsuarioModal({ open, onClose, onSuccess }: InvitarUsuarioModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function handleClose() {
    reset();
    onClose();
  }

  async function onSubmit(data: FormData) {
    const result = await invitarUsuario(data);

    if (!result.ok) {
      toast.error(result.error ?? 'Error al enviar la invitación');
      return;
    }

    toast.success(`Invitación enviada a ${data.email}`);
    reset();
    onSuccess();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-[#121A61] font-['Oswald',sans-serif]"
          >
            Invitar usuario
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="firstName"
                  className="text-xs font-medium text-[#1C1C1C] uppercase tracking-wide"
                >
                  Nombre
                </label>
                <input
                  id="firstName"
                  type="text"
                  {...register('firstName')}
                  placeholder="Juan"
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 text-[#1C1C1C]"
                />
                {errors.firstName && (
                  <p className="text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="lastName"
                  className="text-xs font-medium text-[#1C1C1C] uppercase tracking-wide"
                >
                  Apellido
                </label>
                <input
                  id="lastName"
                  type="text"
                  {...register('lastName')}
                  placeholder="García"
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 text-[#1C1C1C]"
                />
                {errors.lastName && (
                  <p className="text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-xs font-medium text-[#1C1C1C] uppercase tracking-wide"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                placeholder="juan@gimnasia.org.ar"
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 text-[#1C1C1C]"
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="rol"
                className="text-xs font-medium text-[#1C1C1C] uppercase tracking-wide"
              >
                Rol
              </label>
              <Controller
                name="rol"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    id="rol"
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                    options={ROLES_PERMITIDOS.map((rol) => ({ value: rol, label: ROL_LABELS[rol] }))}
                    placeholder="Seleccioná un rol"
                    className={errors.rol ? '[&_button]:border-red-400' : ''}
                  />
                )}
              />
              {errors.rol && (
                <p className="text-xs text-red-600">{errors.rol.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar invitación'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
