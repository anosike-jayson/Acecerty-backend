import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

/**
 * Records an audit entry for every mutating admin request (PRD §8 Observability).
 * Applied globally; only logs successful POST/PATCH/PUT/DELETE on /admin routes.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const url: string = req.originalUrl || req.url || '';
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
    const isAdmin = url.includes('/admin/');

    return next.handle().pipe(
      tap((result) => {
        if (!isMutation || !isAdmin) return;
        const user = req.user as AuthUser | undefined;
        this.audit
          .record({
            actorUserId: user?.id ?? null,
            action: `${method} ${url.split('?')[0]}`,
            entityType: this.deriveEntityType(url),
            entityId: result?.id ?? req.params?.id ?? null,
            metadata: { params: req.params },
          })
          .catch(() => undefined);
      }),
    );
  }

  private deriveEntityType(url: string): string | null {
    const match = /\/admin\/([a-z-]+)/.exec(url);
    return match ? match[1] : null;
  }
}
