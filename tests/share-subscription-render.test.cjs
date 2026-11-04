const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');

// Exercise the actual first render; effects and external services do not run.
// This catches undefined names in hook dependency arrays, including the crash
// caused by selectedCurrency before the form could display anything.
function loadPage(search) {
  const source = fs.readFileSync('src/pages/ShareSubscription.tsx', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  }}).outputText;
  const Box = ({ children }) => React.createElement('div', null, children);
  const ui = new Proxy({}, { get: () => Box });
  function resolve(name) {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name === 'react-router-dom') return { useNavigate: () => () => {}, useSearchParams: () => [new URLSearchParams(search)] };
    if (name === '@tanstack/react-query') return { useQueryClient: () => ({ invalidateQueries: async () => {} }) };
    if (name === 'app/auth') return { useUserGuardContext: () => ({ user: { id: 'recipient', primaryEmail: 'recipient@example.test' } }), auth: {} };
    if (name === 'components/CurrencyProvider') return { useCurrency: () => ({ selectedCurrency: 'ZAR', formatCurrency: value => String(value) }) };
    if (name === 'utils/useUserRoles') return { useUserRoles: () => ({ hasAnyRole: () => false, loading: false }) };
    if (name === 'framer-motion') return { motion: ui };
    if (name === 'app') return { apiClient: {} };
    if (name === '@/lib/utils') return { cn: (...values) => values.join(' ') };
    if (name === 'sonner') return { toast: {} };
    return ui;
  }
  const module = { exports: {} };
  new vm.Script('(function(require,module,exports){' + code + '\n})', { filename: 'ShareSubscription.js' })
    .runInThisContext()(resolve, module, module.exports);
  return module.exports.default;
}

test('invitation URL renders a recovery-aware confirmation screen without crashing', () => {
  const Page = loadPage('invite=b35479f2-7331-4c3f-9d03-34716c667277');
  const html = renderToString(React.createElement(Page));
  assert.match(html, /Your investment invitation/);
  assert.match(html, /Checking your invitation/);
});

test('ordinary subscription entry also renders without undefined dependencies', () => {
  const Page = loadPage('');
  assert.doesNotThrow(() => renderToString(React.createElement(Page)));
});
