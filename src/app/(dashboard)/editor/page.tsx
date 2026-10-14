'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import EditorWorkspace from '@/components/EditorWorkspace';

function EditorWithParams() {
  const params = useSearchParams();
  const ws = useWorkspace();

  // Allow deep links like /editor?path=css/style.css (used by global search
  // and the Pages & Content section).
  useEffect(() => {
    const path = params.get('path');
    if (path && ws.indexed) {
      void ws.openFile(path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, ws.indexed]);

  return <EditorWorkspace fullToolbar />;
}

export default function SourceEditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorWithParams />
    </Suspense>
  );
}
