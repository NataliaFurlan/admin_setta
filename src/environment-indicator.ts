import './environment-indicator.css';

const apiUrl = import.meta.env.VITE_API_URL ?? '';
const isTestEnvironment = apiUrl.includes('api-test-setta.varten.com.br');

if (isTestEnvironment) {
  const indicator = document.createElement('div');
  indicator.className = 'test-environment-indicator';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-label', 'Ambiente de teste');
  indicator.innerHTML = `
    <span class="test-environment-indicator__bar" aria-hidden="true"></span>
    <span class="test-environment-indicator__badge">
      <span aria-hidden="true">🐞</span>
      Ambiente de teste
    </span>
  `;
  document.body.append(indicator);
}
