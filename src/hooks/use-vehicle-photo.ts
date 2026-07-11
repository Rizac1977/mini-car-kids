import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Assina URL do bucket privado "vehicle-photos" para exibir a foto.
export function useVehiclePhotoUrl(path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["vehicle-photo", path],
    queryFn: async () => {
      if (!path) return null;
      // Se já é uma URL completa (http/https ou data:), devolve como está.
      if (/^(https?:|data:|blob:)/i.test(path)) return path;
      const { data, error } = await supabase.storage
        .from("vehicle-photos")
        .createSignedUrl(path, 60 * 60);
      if (error) return null;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
  });
  return data ?? null;
}
