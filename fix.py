import json
f = open('package.json')
pkg = json.load(f)
f.close()
pkg['scripts'] = {
  'dev': 'vite --config vite.config.ts --host 0.0.0.0',
  'build': 'vite build --config vite.config.ts',
  'serve': 'vite preview --config vite.config.ts --host 0.0.0.0'
}
open('package.json','w').write(json.dumps(pkg, indent=2))
print('OK')
