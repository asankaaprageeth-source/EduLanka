import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const CONTAINER_ID = 'html5qr-code-full-region';

const QrScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const scannerRef = useRef(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          alert('Camera හමු නොවිනි. Device එකේ camera ඇති බව confirm කරන්න.');
          return;
        }

        const scanner = new Html5Qrcode(CONTAINER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.777 },
          (decodedText) => {
            onScanSuccess(decodedText);
            stopScanner();
            onClose();
          },
          () => {}
        );
      } catch (err) {
        console.error('Camera start error:', err);
        if (err.name === 'NotAllowedError') {
          alert('Camera permission අවශ්‍යයි.\nBrowser address bar එකේ camera icon click කරලා Allow කරන්න.');
        } else if (err.name === 'NotFoundError') {
          alert('Camera device හමු නොවිනි.');
        } else {
          alert('Camera error: ' + (err.message || err));
        }
      }
    };

    const timer = setTimeout(startScanner, 500);
    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const handleManualSearch = () => {
    const val = document.getElementById('qr-manual-input')?.value?.trim();
    if (val) {
      onScanSuccess(val);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 12,
        padding: 24, width: 380, maxWidth: '95vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Scan Student QR Code</h3>
          <button onClick={handleClose} style={{
            border: 'none', background: 'none',
            fontSize: 22, cursor: 'pointer', lineHeight: 1, color: '#666',
          }}>×</button>
        </div>

        {/* Scanner area */}
        <div id={CONTAINER_ID} style={{ width: '100%', minHeight: 300, borderRadius: 8, overflow: 'hidden' }} />

        <p style={{ textAlign: 'center', fontSize: 13, color: '#666', margin: '12px 0 0' }}>
          Camera lens QR code වෙත යොමු කරන්න
        </p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px' }}>
          <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
          <span style={{ fontSize: 12, color: '#999' }}>හෝ manually ඇතුල් කරන්න</span>
          <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
        </div>

        {/* Manual entry */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="qr-manual-input"
            placeholder="Student ID (e.g. STU123456...)"
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            style={{
              flex: 1, padding: '8px 12px',
              border: '1px solid #ddd', borderRadius: 6,
              fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={handleManualSearch}
            style={{
              padding: '8px 16px', background: '#1976d2',
              color: 'white', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}
          >
            SEARCH
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <button
            onClick={handleClose}
            style={{
              color: '#1976d2', background: 'none',
              border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 14,
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrScannerModal;
