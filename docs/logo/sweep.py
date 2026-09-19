"""A parameter sweep, looked at before a sheet is built on it."""
import explore as E
import along

DARK = '#12201f'
rows = []
for key in ['incisor', 'molar', 'ring', 'drop', 'lens']:
    cells = []
    for thick in [0.10, 0.14, 0.18, 0.24, 0.30]:
        for rev in (False, True):
            cs = E.laid(along.SPINES[key], thick=thick, reverse=rev, closed=True)
            cells.append(f'<div class="c"><span>{thick} {"↺" if rev else "↻"}</span>'
                         f'{E.render(cs, DARK, h=120)}</div>')
    rows.append(f'<h2>{key}</h2><div class="row">{"".join(cells)}</div>')

open('sweep.html', 'w').write(f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
 body{{margin:0;background:#f2efe9;font-family:'Cairo',system-ui;padding:20px;direction:rtl}}
 h2{{font-size:13px;color:#555;margin:16px 0 6px;direction:ltr;text-align:right}}
 .row{{display:grid;grid-template-columns:repeat(10,1fr);gap:8px}}
 .c{{background:#fff;border-radius:10px;padding:8px;text-align:center}}
 .c span{{display:block;font-size:9px;color:#999;direction:ltr;margin-bottom:4px}}
 svg{{width:auto;max-width:100%}}
</style>{''.join(rows)}''')
print('ok')
