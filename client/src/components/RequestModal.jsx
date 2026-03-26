import useAppStore from '../store/appStore';
import { emitAcceptRequest, emitRejectRequest } from '../services/socket';

const RequestModal = () => {
  const { incomingRequest, setIncomingRequest } = useAppStore();

  if (!incomingRequest) {
    return null;
  }

  const handleAccept = () => {
    emitAcceptRequest(incomingRequest.from);
    setIncomingRequest(null);
  };

  const handleReject = () => {
    emitRejectRequest(incomingRequest.from);
    setIncomingRequest(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
        <h2 className="text-2xl font-bold mb-4">
          {incomingRequest.fromName} wants to send you files
        </h2>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Files:</h3>
          <ul className="list-disc list-inside">
            {incomingRequest.files.map((file, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestModal;
