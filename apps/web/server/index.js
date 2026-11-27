import "./env.js";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";
import { currentUser } from "./auth.js";
import { canAccessAdmin } from "./security.js";
import { POST } from "./auth-routes.js";
import { errorPage, renderPage, safeAssetPath } from "./render.js";
import { securityHeaders } from "./http.js";
import { membershipApi } from "./membership-routes.js";
import { communityApi } from './community-routes.js';
import { editorialApi } from './editorial-routes.js';
import { educationApi } from './education-routes.js';
import { profileApi } from './profile-routes.js';
import { profilePhotoApi } from './profile-photo-routes.js';
import { adminDashboardApi } from './admin-dashboard-routes.js';
import { adminAuditApi } from './admin-audit-routes.js';
import { canViewMemberRoute, memberDestination } from "./membership-policy.js";
import {isLaunchPathEnabled} from './launch-policy.js';
import {brokerApi} from './broker-routes.js';
import {toolsSnapshotApi} from './tools-snapshot-routes.js';
import {statementApi} from './statement-routes.js';
import {pcConnectorApi,startPcSecretSweeper} from './pc-connector-routes.js';
import {roomsApi} from './rooms-routes.js';
import {newsApi} from './news-routes.js';
import {eaApi} from './ea-routes.js';
import {usdtApi} from './usdt-payments.js';

const origin = new URL(process.env.APP_ORIGIN ?? "http://127.0.0.1:3000");
const port = Number(process.env.PORT ?? origin.port ?? 3000) || 3000;
export async function handler(incoming, outgoing) {
  for (const [name, value] of Object.entries(securityHeaders(['/app', '/app/mapping'].includes((incoming.url ?? '').split('?')[0]))))
    outgoing.setHeader(name, value);
  outgoing.setHeader("Content-Type", "text/html; charset=utf-8");
  try {
    // Parse the path against configured origin, never trust a client Host header.
    const rawPath = (incoming.url ?? "/").split("?")[0];
    if (
      !rawPath.startsWith("/") ||
      rawPath.startsWith("//") ||
      /\\|%2e|%2f|%5c/i.test(rawPath) ||
      rawPath.split("/").includes("..")
    ) {
      outgoing.writeHead(404);
      outgoing.end(errorPage(404));
      return;
    }
    const url = new URL(incoming.url ?? "/", origin);
    if(!isLaunchPathEnabled(url.pathname)){
      if(url.pathname.startsWith('/api/'))outgoing.setHeader('Content-Type','application/json; charset=utf-8');
      outgoing.writeHead(404);
      outgoing.end(url.pathname.startsWith('/api/')?JSON.stringify({message:'This module is not available in this release.'}):errorPage(404));
      return;
    }
    const method = incoming.method ?? "GET";
    const authAction = url.pathname.match(/^\/api\/auth\/([a-z-]+)$/)?.[1];
    const membershipRoute =
      /^\/api\/membership\/me$/.test(
        url.pathname,
      );
    const communityRoute = /^\/api\/community\/(?:messages(?:\/photo|\/[a-zA-Z0-9_-]{1,80}\/(?:remove|report|image))?|reports)$/.test(url.pathname);
    const editorialRoute = /^\/api\/(?:admin|content)\/(?:analysis|signals)$/.test(url.pathname);
    const educationRoute = /^\/api\/(?:admin|content)\/lessons(?:\/[a-zA-Z0-9_-]{1,80}\/video)?$/.test(url.pathname);
    const profileRoute = ['/api/profile', '/api/admin/clients'].includes(url.pathname);
    const profilePhotoRoute = url.pathname === '/api/profile/photo';
    const pcRoute=['/api/pc-broker/connection','/api/pc-broker/prepare','/api/pc-broker/connect','/api/pc-broker/calendar','/api/pc-worker/poll','/api/pc-worker/check','/api/pc-worker/receipt'].includes(url.pathname);
    const statementRoute=['/api/statements/preview','/api/statements/import','/api/statements/calendar'].includes(url.pathname);
    const brokerRoute=['/api/broker/connection','/api/broker/sync','/api/broker/calendar','/api/broker/servers','/api/broker/live'].includes(url.pathname);
    const toolsSnapshotRoute=url.pathname==='/api/tools/mt5-snapshot';
    const adminDashboardRoute = url.pathname === '/api/admin/dashboard';
    const adminAuditRoute = url.pathname === '/api/admin/audit';
    const roomsRoute = /^\/api\/(?:rooms(?:\/[a-zA-Z0-9_/-]{1,200})?|admin\/(?:rooms(?:\/[a-zA-Z0-9_/-]{1,200})?|mentors))$/.test(url.pathname);
    const newsRoute = url.pathname === '/api/news/usd';
    const usdtRoute = /^\/api\/payments\/usdt(?:\/check)?$/.test(url.pathname);
    const eaRoute = ['/api/ea/status', '/api/ea/commands'].includes(url.pathname);
    if (educationRoute && method === 'PUT') incoming.setTimeout(10 * 60 * 1000);
    if ((authAction && method === "POST") || membershipRoute || communityRoute || editorialRoute || educationRoute || profileRoute || profilePhotoRoute || adminDashboardRoute || adminAuditRoute || brokerRoute || statementRoute || pcRoute || toolsSnapshotRoute || roomsRoute || newsRoute || eaRoute || usdtRoute) {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers))
        if (value)
          headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      const init = {
        method,
        headers,
        ...(!["GET", "HEAD"].includes(method)
          ? {
              body: /** @type {ReadableStream<Uint8Array>} */ (
                Readable.toWeb(incoming)
              ),
              duplex: "half",
            }
          : {}),
      };
      const request = new Request(url, init);
      const response = usdtRoute ? await usdtApi(request) : roomsRoute ? await roomsApi(request) : newsRoute ? await newsApi(request) : eaRoute ? await eaApi(request) : toolsSnapshotRoute ? await toolsSnapshotApi(request) : pcRoute ? await pcConnectorApi(request) : statementRoute ? await statementApi(request) : brokerRoute ? await brokerApi(request) : profilePhotoRoute ? await profilePhotoApi(request) : adminAuditRoute ? await adminAuditApi(request) : adminDashboardRoute ? await adminDashboardApi(request) : profileRoute ? await profileApi(request) : educationRoute ? await educationApi(request) : editorialRoute ? await editorialApi(request) : communityRoute ? await communityApi(request) : membershipRoute
        ? await membershipApi(request)
        : await POST(request, {
            params: Promise.resolve({ action: authAction }),
          });
      outgoing.statusCode = response.status;
      for (const [name, value] of response.headers)
        outgoing.setHeader(name, value);
      if (response.body && method !== 'HEAD') {
        const stream = Readable.fromWeb(/** @type {import('node:stream/web').ReadableStream} */ (/** @type {unknown} */ (response.body)));
        outgoing.on('close', () => stream.destroy());
        stream.on('error', () => outgoing.destroy());
        stream.pipe(outgoing);
      } else outgoing.end();
      return;
    }
    if (!["GET", "HEAD"].includes(method)) {
      outgoing.writeHead(404);
      outgoing.end(errorPage(404));
      return;
    }
    const asset = safeAssetPath(url.pathname);
    if (asset) {
      outgoing.setHeader(
        "Content-Type",
        asset.endsWith('.webp') ? 'image/webp' : asset.endsWith('.svg') ? 'image/svg+xml' : asset.endsWith('.ttf') ? 'font/ttf' : asset.endsWith('.png') ? 'image/png' : asset.endsWith(".css")
          ? "text/css; charset=utf-8"
          : "text/javascript; charset=utf-8",
      );
      const data = await readFile(
        new URL(`../public/${asset}`, import.meta.url),
      ).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (data === null) { outgoing.writeHead(404); outgoing.end(); return; }
      outgoing.end(method === "HEAD" ? undefined : data);
      return;
    }
    const member = url.pathname === "/app" || url.pathname.startsWith("/app/");
    const admin =
      url.pathname === "/admin" || url.pathname.startsWith("/admin/");
    const authEntry=['/auth/login','/auth/register'].includes(url.pathname);
    let user = null;
    if (member || admin || url.pathname==='/' || authEntry) {
      const request = new Request(url, {
        headers: { cookie: incoming.headers.cookie ?? "" },
      });
      user = await currentUser(request);
      if(authEntry&&user){
        outgoing.writeHead(307,{Location:memberDestination(user)});
        outgoing.end();
        return;
      }
    }
    if(member||admin){
      const redirect = !user
        ? "/auth/login"
        : admin && !canAccessAdmin(user)
          ? memberDestination(user) + "?notice=admin-required"
          : ['/app/signals/demo-structure', '/app/signals/demo-support', '/app/signals/demo-review'].includes(url.pathname)
            ? '/app/signals'
          : member && !canViewMemberRoute(user, url.pathname)
            ? url.pathname === "/app"
              ? memberDestination(user)
              : "/app/membership?notice=access-required"
            : null;
      if (redirect) {
        outgoing.writeHead(307, { Location: redirect });
        outgoing.end();
        return;
      }
    }
    const html = await renderPage(url.pathname, user, url.searchParams);
    outgoing.statusCode = html ? 200 : 404;
    outgoing.end(method === "HEAD" ? undefined : (html ?? errorPage(404)));
  } catch {
    // Never expose tokens, connection strings or database exception details.
    if (!outgoing.headersSent) outgoing.writeHead(503);
    outgoing.end(errorPage(503));
  }
}
const server = createServer(handler);
server.requestTimeout = 10 * 60 * 1000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 50;
// Vercel calls `handler` per request (api/index.js); everywhere else run a long-lived server.
if (!process.env.VERCEL) {
  startPcSecretSweeper();
  // HOST=0.0.0.0 on a hosting platform; default stays local-only.
  server.listen(port, process.env.HOST ?? "127.0.0.1", () =>
    console.log(
      `YENQO (${process.env.NODE_ENV}) — http://127.0.0.1:${port}`,
    ),
  );
}
server.on("error", (error) => {
  console.error(
    `Server could not start: ${"code" in error ? error.code : "unknown error"}`,
  );
  process.exitCode = 1;
});
