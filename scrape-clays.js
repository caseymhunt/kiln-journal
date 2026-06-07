#!/usr/bin/env node
// One-time scraper: fetches Armadillo Clay detail pages, extracts description/
// shrinkage/absorption/COE, downloads first product image, writes clay-data.json.

import { writeFileSync, createWriteStream, mkdirSync } from 'fs';
import { get } from 'https';
import { get as httpGet } from 'http';

const IMG_DIR = './public/img/clays';
mkdirSync(IMG_DIR, { recursive: true });

// Clay ID → Armadillo store URL
const CLAY_URLS = {
  // Low fire
  'longhorn-white':       '/store/p4057/Longhorn_White.html',
  'longhorn-red':         '/store/p5/Longhorn_Red.html',
  'longhorn-white-grog':  '/store/p8/Longhorn_White_with_Grog.html',
  'longhorn-red-grog':    '/store/p9/Longhorn_Red_with_Grog.html',
  'modeling-clay':        '/store/p2271/Modeling_Clay.html',
  'raku-low':             '/store/p10/Raku.html',
  // Mid fire
  'buffalo-wallow':       '/store/p12/Buffalo_Wallow.html',
  'buffalo-wallow-grog':  '/store/p13/Buffalo_Wallow_with_Grog.html',
  'cinco-blanco':         '/store/p11/Cinco_Blanco.html',
  'cinco-rojo':           '/store/p14/Cinco_Rojo.html',
  'cinco-rojo-grog':      '/store/p15/Cinco_Rojo_with_Grog.html',
  'cone-5-porcelain':     '/store/p16/Cone_5_Porcelain.html',
  'wc437-frost-porcelain':'/store/p4572/WC437_Frost_Porcelain.html',
  'laguna-bmix-5':        '/store/p17/Laguna_B-Mix_Cone_5.html',
  'laguna-bmix-speckled': '/store/p2858/Cone_5_B-Mix_with_Speckles_%28WC-408%29.html',
  'laguna-speckled-buff': '/store/p2824/Laguna_Speckled_Buff_%28WC-403%29.html',
  'laguna-b3-brown':      '/store/p4525/Laguna_B-3_Brown.html',
  'laguna-azabache':      '/store/p4523/Laguna_Azabache.html',
  'dark-chocolate-32':    '/store/p4258/Dark_Chocolate_NO.32_Cone_5%2F6_Clay.html',
  'raku-mid':             '/store/p10/Raku.html',
  // High fire
  'armstone':             '/store/p19/Armstone.html',
  'balcones':             '/store/p21/Balcones.html',
  'balcones-white':       '/store/p20/Balcones_White.html',
  'balcones-dark':        '/store/p22/Balcones_Dark.html',
  'grande':               '/store/p23/Grande.html',
  'gruene-butter':        '/store/p24/Gruene_Butter.html',
  'dillo-white':          '/store/p25/Dillo_White.html',
  'awesome-possum':       '/store/p28/Awesome_Possum.html',
  'cone-10-porcelain':    '/store/p26/Cone_10_Porcelain.html',
  'laguna-bmix-10':       '/store/p18/Laguna_B-Mix_Cone_10.html',
  'bmix-wood-fire-10':    '/store/p4571/B-Mix_Wood_Fire_Cone_10.html',
  'laguna-lc2-sable':     '/store/p4569/Laguna_LC2_Sable.html',
  'seidel-clay':          '/store/p4330/Seidel_Clay.html',
  'raku-high':            '/store/p10/Raku.html',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? get : httpGet;
    mod(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? get : httpGet;
    mod(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location, dest).then(resolve, reject);
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function parseDetail(html) {
  // Description block
  const descMatch = html.match(/<div id="wsite-com-product-short-description"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  let raw = descMatch ? descMatch[1] : '';

  // Strip HTML tags
  const text = raw.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#160;/g, ' ')
    .replace(/\s+/g, ' ').trim();

  // Extract numeric fields
  const shrinkage  = (text.match(/Shrinkage[^:]*:\s*([\d.]+)%/) || [])[1] || null;
  const absorption = (text.match(/Absorption[^:]*:\s*([\d.]+)%/) || [])[1] || null;
  const coe        = (text.match(/COE[^:]*:\s*([\d.]+)/) || [])[1] || null;

  // Clean description: everything before the first bold label, strip shipping lines
  let desc = text
    .replace(/Shrinkage[\s\S]*$/, '')
    .replace(/THIS LISTING[\s\S]*/i, '')
    .replace(/NEED IT SHIPPED[\s\S]*/i, '')
    .trim()
    .replace(/\s+/g, ' ');

  // og:image tags (take first one that looks like a product photo, not a tiny icon)
  const images = [...html.matchAll(/property="og:image"\s+content="([^"]+)"/g)]
    .map(m => m[1].split('?')[0])  // strip query string sizing params
    .filter(u => u.includes('uploads'));

  return { desc, shrinkage, absorption, coe, images };
}

async function run() {
  const results = {};
  const seen = {};   // URL dedup — raku appears 3× but we only fetch once

  const ids = Object.keys(CLAY_URLS);
  for (const id of ids) {
    const path = CLAY_URLS[id];
    const url  = `https://www.armadilloclay.com${path}`;

    process.stdout.write(`${id} … `);

    let detail;
    if (seen[path]) {
      detail = seen[path];
      console.log('(reused)');
    } else {
      const html = await fetchUrl(url);
      detail = parseDetail(html);
      seen[path] = detail;

      // Download first image
      if (detail.images.length > 0) {
        const imgUrl  = detail.images[0];
        const ext     = imgUrl.split('.').pop().split('?')[0] || 'jpg';
        // Use the base clay id for the shared raku page
        const imgId   = id;
        const imgPath = `${IMG_DIR}/${imgId}.${ext}`;
        try {
          await downloadImage(imgUrl, imgPath);
          detail.imgFile = `img/clays/${imgId}.${ext}`;
        } catch (e) {
          console.warn(`  image download failed: ${e.message}`);
        }
      }
      console.log(`desc="${detail.desc.slice(0,50)}…"  shrinkage=${detail.shrinkage}%  img=${detail.images[0] || 'none'}`);
    }

    // For reused (raku variants), rewrite the imgFile with this id
    if (seen[path] && seen[path] !== detail) {
      // copy raku image under each variant id
      const src = seen[path].imgFile;
      if (src) {
        const ext     = src.split('.').pop();
        const imgPath = `${IMG_DIR}/${id}.${ext}`;
        try {
          const srcBuf = await fetchUrl(`https://www.armadilloclay.com`); // noop, already downloaded
          // Just reference the same file for all raku variants
          detail = { ...seen[path], imgFile: src };
        } catch (_) {}
      } else {
        detail = { ...seen[path] };
      }
      console.log(`  → reused from ${path}`);
    }

    results[id] = {
      desc:       detail.desc       || null,
      shrinkage:  detail.shrinkage  ? parseFloat(detail.shrinkage)  : null,
      absorption: detail.absorption ? parseFloat(detail.absorption) : null,
      coe:        detail.coe        ? parseFloat(detail.coe)        : null,
      img:        detail.imgFile    || null,
    };

    await new Promise(r => setTimeout(r, 300)); // polite delay
  }

  writeFileSync('./clay-data.json', JSON.stringify(results, null, 2));
  console.log('\nWrote clay-data.json');
}

run().catch(err => { console.error(err); process.exit(1); });
