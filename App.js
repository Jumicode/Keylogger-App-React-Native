import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import UdpSocket from 'react-native-udp';
import { NetworkInfo } from 'react-native-network-info';

export default function App() {
  const [isServer, setIsServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [socket, setSocket] = useState(null);
  const [ipAddress, setIpAddress] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ipServer, setIpServer] = useState('');
  const [typedText, setTypedText] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    const fetchIpAddress = async () => {
      const ip = await NetworkInfo.getIPV4Address();
      setIpAddress(ip);
    };

    fetchIpAddress();

    if (isServer) {
      const server = UdpSocket.createSocket('udp4');

      server.on('message', (data, rinfo) => {
        setMensaje(data.toString());
        console.log('Texto recibido:', data.toString());
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
    };
  }, [isServer]);

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

  const disconnectFromServer = () => {
    if (socket) {
      socket.close();
      setSocket(null);
      setSocketConnected(false);
    }
  };

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comunicación UDP</Text>

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
          <Text style={styles.label}>Texto recibido:</Text>
          <Text style={styles.message}>{mensaje}</Text>
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

// 💠 Estilos mejorados
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
  message: {
    fontSize: 16,
    color: '#ffcc00',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
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
});
