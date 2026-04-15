import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'juridico-secret-key-2024';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token nao fornecido' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token invalido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.organizacao_id = decoded.organizacao_id;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expirado ou invalido' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    // super_admin bypasses all role checks
    if (req.user.perfil === 'super_admin') return next();
    if (!roles.includes(req.user.perfil)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
}

export function requireSuperAdmin() {
  return (req, res, next) => {
    if (req.user.perfil !== 'super_admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador do sistema' });
    }
    next();
  };
}

export { JWT_SECRET };
