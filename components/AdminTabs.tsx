'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export function AdminTabs({ activeTab }: { activeTab: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const navigate = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    // Reset page when switching tabs so stale pagination state doesn't linger
    if (tab !== activeTab) {
      params.delete('page');
      params.delete('pageSize');
    }
    router.push(`/admin?${params.toString()}`);
  };

  return (
    <div className="admin-tabs">
      <button
        onClick={() => navigate('requests')}
        className={`admin-tabs__btn ${activeTab === 'requests' ? 'is-active' : ''}`}
      >
        Requests
      </button>
      <button
        onClick={() => navigate('settings')}
        className={`admin-tabs__btn ${activeTab === 'settings' ? 'is-active' : ''}`}
      >
        Settings
      </button>
    </div>
  );
}
