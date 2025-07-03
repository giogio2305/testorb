import React from 'react';

export default function AppInstallSection({
  isAppInstalled,
  installing,
  checking,
  onCheckApp,
  onInstallApp
}) {
  if (isAppInstalled === true) {
    return (
      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">App Installed</span>
    );
  }
  if (isAppInstalled === false) {
    return (
      <div className="flex items-center space-x-2">
        <button
          className="btn btn-primary btn-sm"
          onClick={onInstallApp}
          disabled={installing}
        >
          {installing ? 'Installing...' : 'Install App'}
        </button>
      </div>
    );
  }
  // isAppInstalled === null or undefined
  return (
    <button
      className="btn btn-blue btn-sm"
      onClick={onCheckApp}
      disabled={checking}
    >
      {checking ? 'Checking...' : 'Check if App Installed'}
    </button>
  );
}