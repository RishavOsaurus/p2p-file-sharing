import useAppStore from '../store/appStore';

const TransferProgress = () => {
  const { transfers } = useAppStore();

  if (Object.keys(transfers).length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <h3 className="font-semibold mb-3">Transfers</h3>
      {Object.entries(transfers).map(([id, transfer]) => (
        <div key={id} className="mb-3">
          <p className="text-sm font-medium text-gray-700 truncate">
            {transfer.fileName}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${(transfer.progress / transfer.total) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round((transfer.progress / transfer.total) * 100)}%
          </p>
        </div>
      ))}
    </div>
  );
};

export default TransferProgress;
