// Traduz mensagens comuns do Supabase Auth para pt-BR
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
  if (m.includes("password is known to be weak") || m.includes("pwned"))
    return "Esta senha é muito comum e foi encontrada em vazamentos públicos. Escolha uma senha mais forte (misture letras maiúsculas, minúsculas, números e símbolos).";
  if (m.includes("password should be at least"))
    return "A senha deve ter pelo menos 8 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email") || m.includes("invalid format"))
    return "E-mail inválido. Verifique e tente novamente.";
  if (m.includes("signup") && m.includes("disabled"))
    return "Cadastros estão temporariamente desativados.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns segundos e tente novamente.";
  if (m.includes("network")) return "Falha de conexão. Verifique sua internet.";
  return message;
}
