/**
 * markdown.js — rendu Markdown + coloration syntaxique, sans dépendance.
 * Couvre ce qu'utilise le lab : titres, paragraphes, gras/italique/code,
 * liens, listes, blockquotes, tables GFM, hr, blocs de code colorés.
 */

/* --- slugify : DOIT rester identique à scripts/build-index.mjs --- */
export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function safeUrl(url) {
  const u = url.trim();
  if (/^\s*javascript:/i.test(u) || /^\s*data:/i.test(u) || /^\s*vbscript:/i.test(u)) return '#';
  return u;
}

/* ------------------------------------------------------------------ */
/* Coloration syntaxique                                               */
/* ------------------------------------------------------------------ */

const KW = {
  bash: 'if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|echo|read|export|local|sudo|source|cd|ls|cat|grep|find|chmod|chown|nc|nmap|ssh|scp|wget|curl|python3|python|bash|sh|kill|systemctl|crontab|apt|touch|mkdir|cp|mv|rm|whoami|hostname|ip|ping|tcpdump|hydra|gobuster|john|unshadow|mimikatz|msfconsole',
  powershell: 'Get-\\w+|Set-\\w+|New-\\w+|Where-Object|Sort-Object|Select-Object|Write-Output|Invoke-\\w+|IEX|foreach|if|else|elseif|function|param|return|New-Object',
  sql: 'SELECT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|FROM|WHERE|AND|OR|LIKE|ORDER|BY|LIMIT|OFFSET|GROUP|COUNT|SUM|AVG|MAX|MIN|UNION|NULL|SHOW|DATABASES|TABLES|USE|DESCRIBE|DESC|SLEEP|JOIN|ON|AS',
  python: 'def|return|import|from|as|if|elif|else|for|while|in|is|not|and|or|None|True|False|class|try|except|finally|with|lambda|print|len|range|open',
  javascript: 'const|let|var|function|return|if|else|for|while|of|in|new|await|async|class|this|null|undefined|true|false|typeof|console|Math|import|export|from|=>',
};

function ruleset(lang) {
  const common = {
    number: /\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b/y,
    str1: /"(?:[^"\\]|\\.)*"/y,
    str2: /'(?:[^'\\]|\\.)*'/y,
  };
  switch (lang) {
    case 'bash':
    case 'shell':
    case 'sh':
      return [
        ['comment', /#[^\n]*/y],
        ['string', common.str1],
        ['string', common.str2],
        ['variable', /\$\{?\w+\}?|\$[@#*?!$-]/y],
        ['flag', /(?:^|\s)(-{1,2}[a-zA-Z][\w-]*)/y],
        ['keyword', new RegExp(`\\b(?:${KW.bash})\\b`, 'y')],
        ['number', common.number],
        ['operator', /[|&;><]+/y],
      ];
    case 'powershell':
    case 'ps':
      return [
        ['comment', /#[^\n]*/y],
        ['string', common.str1],
        ['string', common.str2],
        ['variable', /\$\w+/y],
        ['keyword', new RegExp(`(?:${KW.powershell})`, 'y')],
        ['number', common.number],
        ['operator', /\||-\w+/y],
      ];
    case 'sql':
      return [
        ['comment', /--[^\n]*/y],
        ['string', common.str2],
        ['string', common.str1],
        ['keyword', new RegExp(`\\b(?:${KW.sql})\\b`, 'yi')],
        ['number', common.number],
        ['operator', /[=<>!]+/y],
      ];
    case 'python':
    case 'py':
      return [
        ['comment', /#[^\n]*/y],
        ['string', common.str1],
        ['string', common.str2],
        ['keyword', new RegExp(`\\b(?:${KW.python})\\b`, 'y')],
        ['number', common.number],
      ];
    case 'javascript':
    case 'js':
      return [
        ['comment', /\/\/[^\n]*/y],
        ['string', common.str1],
        ['string', common.str2],
        ['keyword', new RegExp(`\\b(?:${KW.javascript})\\b`, 'y')],
        ['number', common.number],
      ];
    default:
      return [
        ['comment', /(?:#|\/\/)[^\n]*/y],
        ['string', common.str1],
        ['string', common.str2],
        ['number', common.number],
      ];
  }
}

function highlight(code, lang) {
  const esc = escapeHtml(code);
  const rules = ruleset((lang || '').toLowerCase());
  let out = '';
  let i = 0;
  while (i < esc.length) {
    let matched = false;
    for (const [type, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(esc);
      if (m && m.index === i && m[0].length > 0) {
        // Certaines règles capturent un groupe (ex: flag précédé d'un espace)
        const full = m[0];
        const tok = m[1] !== undefined ? m[1] : full;
        const pre = full.slice(0, full.length - tok.length);
        out += pre + `<span class="tok tok-${type}">${tok}</span>`;
        i += full.length;
        matched = true;
        break;
      }
    }
    if (!matched) { out += esc[i]; i += 1; }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Rendu inline                                                        */
/* ------------------------------------------------------------------ */

function inline(text) {
  const codes = [];
  let t = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  t = escapeHtml(t);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label, url) => `<a href="${escapeAttr(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code class="inline">${escapeHtml(codes[i])}</code>`);
  return t;
}

/* ------------------------------------------------------------------ */
/* Rendu bloc                                                          */
/* ------------------------------------------------------------------ */

export function renderMarkdown(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const seen = new Map();
  const anchorFor = (text) => {
    const base = slugify(text) || 'section';
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };

  let html = '';
  let i = 0;

  const isTableSep = (l) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(l) && l.includes('-');

  while (i < lines.length) {
    let line = lines[i];

    // Ligne vide
    if (!line.trim()) { i += 1; continue; }

    // Bloc de code
    const fence = line.match(/^\s*```(\S*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const buf = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i += 1; }
      i += 1; // saute la fence de fin
      const raw = buf.join('\n');
      const label = lang ? lang.toLowerCase() : 'code';
      html += `<div class="code-block" data-lang="${escapeAttr(label)}">`
        + `<div class="code-head"><span class="code-lang">${escapeHtml(label)}</span>`
        + `<button class="code-copy" type="button" aria-label="Copier le code">Copier</button></div>`
        + `<pre><code>${highlight(raw, lang)}</code></pre></div>`;
      continue;
    }

    // Titres
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].replace(/\s*#+\s*$/, '').trim();
      const id = level >= 2 && level <= 4 ? anchorFor(text.replace(/`/g, '')) : slugify(text);
      html += `<h${level} id="${escapeAttr(id)}" class="md-h md-h${level}">`
        + `<a class="anchor" href="#${escapeAttr(id)}" aria-hidden="true">#</a>${inline(text)}</h${level}>`;
      i += 1;
      continue;
    }

    // Séparateur
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { html += '<hr>'; i += 1; continue; }

    // Table GFM
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const parseRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const headers = parseRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(parseRow(lines[i])); i += 1; }
      html += '<div class="table-wrap"><table><thead><tr>'
        + headers.map((c) => `<th>${inline(c)}</th>`).join('')
        + '</tr></thead><tbody>'
        + rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('')
        + '</tbody></table></div>';
      continue;
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i += 1; }
      html += `<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`;
      continue;
    }

    // Listes
    const ulItem = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const olItem = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (ulItem || olItem) {
      const ordered = !!olItem;
      const tag = ordered ? 'ol' : 'ul';
      html += `<${tag} class="md-list">`;
      const itemRe = ordered ? /^(\s*)\d+\.\s+(.*)$/ : /^(\s*)[-*+]\s+(.*)$/;
      while (i < lines.length) {
        const m = lines[i].match(itemRe);
        if (!m) {
          // continuation d'item (ligne indentée non vide, non-liste)
          if (lines[i].trim() && /^\s+/.test(lines[i]) && !lines[i].match(/^(\s*)([-*+]|\d+\.)\s+/)) {
            html = html.replace(/<\/li>$/, ' ' + inline(lines[i].trim()) + '</li>');
            i += 1;
            continue;
          }
          break;
        }
        html += `<li>${inline(m[2])}</li>`;
        i += 1;
      }
      html += `</${tag}>`;
      continue;
    }

    // Paragraphe
    const buf = [];
    while (i < lines.length && lines[i].trim()
      && !/^\s*```/.test(lines[i])
      && !/^(#{1,6})\s+/.test(lines[i])
      && !/^\s*>/.test(lines[i])
      && !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
      && !lines[i].match(/^(\s*)([-*+]|\d+\.)\s+/)
      && !(lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
      buf.push(lines[i]);
      i += 1;
    }
    if (buf.length) html += `<p>${inline(buf.join(' '))}</p>`;
  }

  return html;
}
