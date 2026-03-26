const DeviceList = ({ devices, onSelectDevice }) => {
  if (devices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No other devices in this room</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {devices.map((device) => (
        <button
          key={device.id}
          onClick={() => onSelectDevice(device)}
          className="p-4 border border-gray-300 rounded-lg hover:bg-blue-50 transition text-left hover:border-blue-500"
          data-testid={`device-${device.id}`}
        >
          <p className="font-medium text-gray-900">{device.name}</p>
          <p className="text-sm text-gray-500 mt-1">Click to send files</p>
        </button>
      ))}
    </div>
  );
};

export default DeviceList;
