import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UploadsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    // Only handle GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const url = req.originalUrl || req.url;

    // Check if this is an uploads request
    if (!url.startsWith('/uploads/')) {
      return next();
    }

    // Verify JWT authentication
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'Server configuration error' });
      }
      jwt.verify(token, secret || 'dev_secret_DO_NOT_USE_IN_PROD');
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
      // Extract the file path after /uploads/
      const filePath = url.substring('/uploads/'.length).split('?')[0];
      const decodedPath = decodeURIComponent(filePath);

      // Resolve paths to prevent directory traversal attacks
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const fullPath = path.resolve(uploadsDir, path.normalize(decodedPath));

      // Ensure resolved path is still within uploads directory
      if (!fullPath.startsWith(uploadsDir + path.sep) && fullPath !== uploadsDir) {
        return res.status(400).json({ error: 'Chemin de fichier invalide' });
      }

      // Check if file exists and is a file
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        return res.status(404).json({ error: 'Fichier non trouvé' });
      }

      // Get file stats
      const stats = fs.statSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const filename = path.basename(fullPath);

      // Set response headers
      const mimeTypes: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.zip': 'application/zip',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      const isImage = contentType.startsWith('image/');
      const dispositionType = isImage ? 'inline' : 'attachment';
      res.setHeader(
        'Content-Disposition',
        `${dispositionType}; filename="${encodeURIComponent(filename)}"`,
      );
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Stream the file
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);

      return; // Don't call next()
    } catch {
      return res.status(500).json({ error: 'Erreur serveur interne' });
    }
  }
}
