import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  PermissionsAndroid, 
  Platform 
} from 'react-native';
import UdpSocket from 'react-native-udp';
import { NetworkInfo } from 'react-native-network-info';
import Geolocation from '@react-native-community/geolocation';

export default function App() {
  // Estados de la comunicación UDP y keylogger
  const [isServer, setIsServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [socket, setSocket] = useState(null);
  const [ipAddress, setIpAddress] = useState('');
  const [ipServer, setIpServer] = useState('');
  const [typedText, setTypedText] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [logs, setLogs] = useState([]); // Historial de mensajes recibidos

  // Estados para la geolocalización
  const [currentLongitude, setCurrentLongitude] = useState('...');
  const [currentLatitude, setCurrentLatitude] = useState('...');
  const [locationStatus, setLocationStatus] = useState('');
  
  let watchID = null; // Para almacenar el identificador de la suscripción de ubicación

  useEffect(() => {
    const fetchIpAddress = async () => {
      const ip = await NetworkInfo.getIPV4Address();
      setIpAddress(ip);
    };

    fetchIpAddress();

    if (isServer) {
      const server = UdpSocket.createSocket('udp4');

      server.on('message', (data, rinfo) => {
        const logEntry = `[${new Date().toLocaleTimeString()}] ${rinfo.address}: ${data.toString()}`;
        setLogs(prevLogs => [...prevLogs, logEntry]);
        console.log(logEntry);
      });

      server.on('listening', () => {
        console.log('Servidor escuchando en el puerto:', server.address().port);
        setConnectionStatus(`Servidor en el puerto ${server.address().port}`);
      });

      server.bind(8888);
      setSocket(server);
    } else {
      setConnectionStatus('Servidor desconectado');
    }

    return () => {
      if (socket) {
        socket.close();
        setSocketConnected(false);
      }
      if (watchID !== null) {
        Geolocation.clearWatch(watchID);
      }
    };
  }, [isServer]);

  // Función para conectar el cliente
  const connectToServer = () => {
    if (!isServer && ipServer.trim() !== '') {
      const client = UdpSocket.createSocket('udp4');

      client.bind(8887, () => {
        console.log('Cliente conectado');
        setSocketConnected(true);
      });

      setSocket(client);
    }
  };

  // Función para desconectar el cliente
  const disconnectFromServer = () => {
    if (socket) {
      socket.close();
      setSocket(null);
      setSocketConnected(false);
    }
  };

  // Función que envía el texto cada vez que se actualiza el TextInput (keylogger)
  const handleTextChange = (text) => {
    setTypedText(text);

    if (!isServer && socket && ipServer) {
      socket.send(text, undefined, undefined, 8888, ipServer, (error) => {
        if (error) {
          console.log('Error al enviar texto:', error);
        }
      });
    }
  };

  // Funciones de geolocalización
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      getOneTimeLocation();
      subscribeLocationLocation();
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'This App needs to Access your location',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getOneTimeLocation();
          subscribeLocationLocation();
        } else {
          setLocationStatus('Permission Denied');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const getOneTimeLocation = () => {
    setLocationStatus('Getting Location ...');
    Geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus('You are Here');
        const currentLongitude = JSON.stringify(position.coords.longitude);
        const currentLatitude = JSON.stringify(position.coords.latitude);
        setCurrentLongitude(currentLongitude);
        setCurrentLatitude(currentLatitude);
      },
      (error) => {
        setLocationStatus(error.message);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 1000 }
    );
  };

  const subscribeLocationLocation = () => {
    watchID = Geolocation.watchPosition(
      (position) => {
        setLocationStatus('You are Here');
        const currentLongitude = JSON.stringify(position.coords.longitude);
        const currentLatitude = JSON.stringify(position.coords.latitude);
        setCurrentLongitude(currentLongitude);
        setCurrentLatitude(currentLatitude);
      },
      (error) => {
        setLocationStatus(error.message);
      },
      { enableHighAccuracy: false, maximumAge: 1000 }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comunicación UDP</Text>

      {/* Botón para iniciar/detener servidor solo se muestra si el cliente no está conectado */}
      {!socketConnected && (
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsServer(!isServer)}
        >
          <Text style={styles.toggleButtonText}>
            {isServer ? 'Detener Servidor' : 'Iniciar Servidor'}
          </Text>
        </TouchableOpacity>
      )}

      {isServer ? (
        <View style={styles.serverContainer}>
          <Text style={styles.status}>{connectionStatus}</Text>
          <Text style={styles.label}>IP del Servidor:</Text>
          <Text style={styles.info}>{ipAddress}</Text>
          
          <Text style={styles.label}>Entradas del teclado del cliente:</Text>
          <ScrollView style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>

          {/* Botón para obtener ubicación */}
          <TouchableOpacity style={styles.locationButton} onPress={requestLocationPermission}>
            <Text style={styles.locationButtonText}>Obtener Ubicación del cliente</Text>
          </TouchableOpacity>
          
          {/* Mostrar la información de ubicación */}
          <Text style={styles.locationText}>Coordenadas del cliente:</Text>
          <Text style={styles.locationText}>Longitude: {currentLongitude}</Text>
          <Text style={styles.locationText}>Latitude: {currentLatitude}</Text>
        </View>
      ) : (
        <View style={styles.clientContainer}>
          <Text style={styles.label}>IP del Servidor:</Text>
          <TextInput 
            onChangeText={setIpServer} 
            value={ipServer} 
            placeholder="Ej: 192.168.1.100"
            style={styles.input}
          />
          {!socketConnected ? (
            <TouchableOpacity style={styles.connectButton} onPress={connectToServer}>
              <Text style={styles.connectButtonText}>Conectar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnectFromServer}>
              <Text style={styles.disconnectButtonText}>Desconectar</Text>
            </TouchableOpacity>
          )}

          <TextInput
            placeholder="Escribe aquí..."
            value={typedText}
            onChangeText={handleTextChange}
            style={styles.input}
          />

          {socketConnected && <Text style={styles.connected}>✅ Socket Conectado</Text>}
        </View>
      )}
    </View>
  );
}

// Estilos para la UI
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ffcc',
    marginBottom: 20,
  },
  toggleButton: {
    backgroundColor: '#00ffcc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#121212',
  },
  serverContainer: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  clientContainer: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  status: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#aaaaaa',
    marginTop: 10,
  },
  info: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logsContainer: {
    width: '100%',
    maxHeight: 200,
    marginTop: 10,
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
  },
  logText: {
    color: '#0f0',
    fontSize: 14,
  },
  input: {
    width: '90%',
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: 10,
    marginTop: 10,
    borderRadius: 10,
  },
  connectButton: {
    backgroundColor: '#00ffcc',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#121212',
  },
  disconnectButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  disconnectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  connected: {
    marginTop: 15,
    fontSize: 16,
    color: '#00ffcc',
    fontWeight: 'bold',
  },
  locationButton: {
    backgroundColor: '#00ffcc',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 15,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#121212',
  },
  locationText: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 10,
  },
});
