/** Shared extension fallback for authorized direct files and OSS media exports. */
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  pdf: 'application/pdf',
  txt: 'text/plain',
  json: 'application/json',
  // #8805: 网页预览的入口文件与同目录伴随资源走同一条 media:fetch 通道,
  // 缺这几个映射时 prepare 阶段把 .html 报成 application/octet-stream,
  // 下游拿不到 text/html 就不再按网页分流。
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
};

/** Bare lowercase extension; an authoritative MIME from the resolver takes precedence. */
export function mimeOf(ext: string): string {
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}
export { MIME_BY_EXT };
