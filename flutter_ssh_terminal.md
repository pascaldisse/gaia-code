# Flutter SSH Terminal App for iOS

## Project Setup

1. Install Flutter if not already installed:
```bash
brew install flutter
```

2. Create a new Flutter project:
```bash
flutter create ssh_terminal
cd ssh_terminal
```

3. Add the required dependencies in `pubspec.yaml`:
```yaml
dependencies:
  flutter:
    sdk: flutter
  dartssh2: ^2.8.2  # SSH implementation in pure Dart
  xterm: ^3.5.0     # Terminal emulator widget
  shared_preferences: ^2.2.0  # For saving connection configs
  permission_handler: ^10.4.3  # For iOS permissions
```

4. Install dependencies:
```bash
flutter pub get
```

## iOS Configuration

1. Update iOS permissions in `ios/Runner/Info.plist`:
```xml
<key>NSNetworkVolumesUsageDescription</key>
<string>We need access to communicate with SSH servers</string>
<key>NSLocalNetworkUsageDescription</key>
<string>This app needs access to connect to SSH servers on your local network</string>
```

2. Set minimum iOS version in `ios/Runner/Info.plist`:
```xml
<key>MinimumOSVersion</key>
<string>11.0</string>
```

## Core Implementation

### 1. Create Connection Model

Create a file `lib/models/ssh_connection.dart`:

```dart
class SSHConnection {
  final String name;
  final String host;
  final int port;
  final String username;
  final String password;
  final String privateKey;
  final bool usePrivateKey;

  SSHConnection({
    required this.name,
    required this.host,
    required this.port,
    required this.username,
    this.password = '',
    this.privateKey = '',
    this.usePrivateKey = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'host': host,
      'port': port,
      'username': username,
      'password': password,
      'privateKey': privateKey,
      'usePrivateKey': usePrivateKey,
    };
  }

  factory SSHConnection.fromJson(Map<String, dynamic> json) {
    return SSHConnection(
      name: json['name'],
      host: json['host'],
      port: json['port'],
      username: json['username'],
      password: json['password'] ?? '',
      privateKey: json['privateKey'] ?? '',
      usePrivateKey: json['usePrivateKey'] ?? false,
    );
  }
}
```

### 2. Create SSH Service

Create a file `lib/services/ssh_service.dart`:

```dart
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:dartssh2/dartssh2.dart';
import '../models/ssh_connection.dart';

class SSHService {
  SSHClient? _client;
  SSHSession? _session;
  StreamController<String> outputController = StreamController<String>.broadcast();
  
  bool get isConnected => _client != null && _session != null;

  Future<bool> connect(SSHConnection connection) async {
    try {
      final socket = await SSHSocket.connect(
        connection.host,
        connection.port,
        timeout: const Duration(seconds: 10),
      );

      final SSHPenOpts authentication;
      if (connection.usePrivateKey && connection.privateKey.isNotEmpty) {
        authentication = SSHKeyPair(connection.privateKey);
      } else {
        authentication = SSHPasswordAuth(connection.password);
      }

      _client = SSHClient(
        socket,
        username: connection.username,
        onPasswordRequest: () => connection.password,
        identities: connection.usePrivateKey ? [SSHKeyPair.fromPem(connection.privateKey)] : null,
      );

      _session = await _client!.shell(
        pty: SSHPtyConfig(
          width: 80,
          height: 25,
          term: 'xterm-256color',
        ),
      );

      // Handle output from the server
      _session!.stdout.listen((data) {
        final output = utf8.decode(data);
        outputController.add(output);
      });

      _session!.stderr.listen((data) {
        final output = utf8.decode(data);
        outputController.add(output);
      });

      return true;
    } catch (e) {
      outputController.add('Connection error: ${e.toString()}\n');
      return false;
    }
  }

  void sendCommand(String command) {
    if (_session != null) {
      _session!.stdin.add(utf8.encode(command));
    }
  }

  void resize(int width, int height) {
    if (_session != null) {
      _session!.resizeTerminal(width, height);
    }
  }

  Future<void> disconnect() async {
    await _session?.close();
    await _client?.close();
    _session = null;
    _client = null;
  }

  void dispose() {
    disconnect();
    outputController.close();
  }
}
```

### 3. Create Connection Storage Service

Create a file `lib/services/connection_storage.dart`:

```dart
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/ssh_connection.dart';

class ConnectionStorage {
  static const String _storageKey = 'ssh_connections';

  Future<List<SSHConnection>> getConnections() async {
    final prefs = await SharedPreferences.getInstance();
    final String? connectionsJson = prefs.getString(_storageKey);
    
    if (connectionsJson == null) {
      return [];
    }
    
    List<dynamic> connections = jsonDecode(connectionsJson);
    return connections.map((json) => SSHConnection.fromJson(json)).toList();
  }

  Future<void> saveConnections(List<SSHConnection> connections) async {
    final prefs = await SharedPreferences.getInstance();
    final List<Map<String, dynamic>> jsonList = 
        connections.map((connection) => connection.toJson()).toList();
    await prefs.setString(_storageKey, jsonEncode(jsonList));
  }

  Future<void> addConnection(SSHConnection connection) async {
    final connections = await getConnections();
    connections.add(connection);
    await saveConnections(connections);
  }

  Future<void> updateConnection(SSHConnection connection, int index) async {
    final connections = await getConnections();
    if (index >= 0 && index < connections.length) {
      connections[index] = connection;
      await saveConnections(connections);
    }
  }

  Future<void> deleteConnection(int index) async {
    final connections = await getConnections();
    if (index >= 0 && index < connections.length) {
      connections.removeAt(index);
      await saveConnections(connections);
    }
  }
}
```

### 4. Main App & UI Implementation

Update `lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'screens/connection_list_screen.dart';

void main() {
  runApp(const SSHTerminalApp());
}

class SSHTerminalApp extends StatelessWidget {
  const SSHTerminalApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SSH Terminal',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        brightness: Brightness.dark,
        useMaterial3: true,
      ),
      home: const ConnectionListScreen(),
    );
  }
}
```

### 5. Connection List Screen

Create `lib/screens/connection_list_screen.dart`:

```dart
import 'package:flutter/material.dart';
import '../models/ssh_connection.dart';
import '../services/connection_storage.dart';
import 'connection_form_screen.dart';
import 'terminal_screen.dart';

class ConnectionListScreen extends StatefulWidget {
  const ConnectionListScreen({Key? key}) : super(key: key);

  @override
  State<ConnectionListScreen> createState() => _ConnectionListScreenState();
}

class _ConnectionListScreenState extends State<ConnectionListScreen> {
  final ConnectionStorage _storage = ConnectionStorage();
  List<SSHConnection> _connections = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadConnections();
  }

  Future<void> _loadConnections() async {
    final connections = await _storage.getConnections();
    setState(() {
      _connections = connections;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SSH Connections'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _connections.isEmpty
              ? Center(
                  child: Text(
                    'No saved connections',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                )
              : ListView.builder(
                  itemCount: _connections.length,
                  itemBuilder: (context, index) {
                    final connection = _connections[index];
                    return ListTile(
                      title: Text(connection.name),
                      subtitle: Text('${connection.username}@${connection.host}:${connection.port}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit),
                            onPressed: () => _editConnection(context, connection, index),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete),
                            onPressed: () => _deleteConnection(index),
                          ),
                        ],
                      ),
                      onTap: () => _connect(context, connection),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addConnection(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Future<void> _addConnection(BuildContext context) async {
    final result = await Navigator.push<SSHConnection>(
      context,
      MaterialPageRoute(
        builder: (context) => const ConnectionFormScreen(),
      ),
    );

    if (result != null) {
      await _storage.addConnection(result);
      _loadConnections();
    }
  }

  Future<void> _editConnection(
      BuildContext context, SSHConnection connection, int index) async {
    final result = await Navigator.push<SSHConnection>(
      context,
      MaterialPageRoute(
        builder: (context) => ConnectionFormScreen(connection: connection),
      ),
    );

    if (result != null) {
      await _storage.updateConnection(result, index);
      _loadConnections();
    }
  }

  Future<void> _deleteConnection(int index) async {
    await _storage.deleteConnection(index);
    _loadConnections();
  }

  void _connect(BuildContext context, SSHConnection connection) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TerminalScreen(connection: connection),
      ),
    );
  }
}
```

### 6. Connection Form Screen

Create `lib/screens/connection_form_screen.dart`:

```dart
import 'package:flutter/material.dart';
import '../models/ssh_connection.dart';

class ConnectionFormScreen extends StatefulWidget {
  final SSHConnection? connection;

  const ConnectionFormScreen({Key? key, this.connection}) : super(key: key);

  @override
  State<ConnectionFormScreen> createState() => _ConnectionFormScreenState();
}

class _ConnectionFormScreenState extends State<ConnectionFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _hostController = TextEditingController();
  final _portController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _privateKeyController = TextEditingController();
  bool _usePrivateKey = false;

  @override
  void initState() {
    super.initState();
    if (widget.connection != null) {
      _nameController.text = widget.connection!.name;
      _hostController.text = widget.connection!.host;
      _portController.text = widget.connection!.port.toString();
      _usernameController.text = widget.connection!.username;
      _passwordController.text = widget.connection!.password;
      _privateKeyController.text = widget.connection!.privateKey;
      _usePrivateKey = widget.connection!.usePrivateKey;
    } else {
      _portController.text = '22';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _hostController.dispose();
    _portController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    _privateKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.connection == null
            ? 'Add Connection'
            : 'Edit Connection'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Connection Name',
                  hintText: 'My Server',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _hostController,
                decoration: const InputDecoration(
                  labelText: 'Host',
                  hintText: 'example.com or 192.168.1.100',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a host';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _portController,
                decoration: const InputDecoration(
                  labelText: 'Port',
                  hintText: '22',
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a port';
                  }
                  final port = int.tryParse(value);
                  if (port == null || port <= 0 || port > 65535) {
                    return 'Please enter a valid port (1-65535)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _usernameController,
                decoration: const InputDecoration(
                  labelText: 'Username',
                  hintText: 'root',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a username';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                title: const Text('Use Private Key'),
                value: _usePrivateKey,
                onChanged: (value) {
                  setState(() {
                    _usePrivateKey = value;
                  });
                },
              ),
              const SizedBox(height: 16),
              if (!_usePrivateKey)
                TextFormField(
                  controller: _passwordController,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                  ),
                  obscureText: true,
                  validator: (value) {
                    if (!_usePrivateKey && (value == null || value.isEmpty)) {
                      return 'Please enter a password';
                    }
                    return null;
                  },
                ),
              if (_usePrivateKey)
                TextFormField(
                  controller: _privateKeyController,
                  decoration: const InputDecoration(
                    labelText: 'Private Key (PEM format)',
                  ),
                  maxLines: 5,
                  validator: (value) {
                    if (_usePrivateKey && (value == null || value.isEmpty)) {
                      return 'Please enter a private key';
                    }
                    return null;
                  },
                ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _saveConnection,
                child: const Text('Save Connection'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _saveConnection() {
    if (_formKey.currentState!.validate()) {
      final connection = SSHConnection(
        name: _nameController.text,
        host: _hostController.text,
        port: int.parse(_portController.text),
        username: _usernameController.text,
        password: _passwordController.text,
        privateKey: _privateKeyController.text,
        usePrivateKey: _usePrivateKey,
      );

      Navigator.pop(context, connection);
    }
  }
}
```

### 7. Terminal Screen

Create `lib/screens/terminal_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:xterm/xterm.dart';
import '../models/ssh_connection.dart';
import '../services/ssh_service.dart';

class TerminalScreen extends StatefulWidget {
  final SSHConnection connection;

  const TerminalScreen({Key? key, required this.connection}) : super(key: key);

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final terminal = Terminal(
    maxLines: 10000,
  );
  final SSHService _sshService = SSHService();
  bool _isConnecting = true;
  bool _isConnected = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _setupTerminal();
    _connect();
  }

  void _setupTerminal() {
    terminal.onOutput = (data) {
      _sshService.sendCommand(data);
    };

    terminal.onResize = (width, height, pixelWidth, pixelHeight) {
      if (_isConnected) {
        _sshService.resize(width, height);
      }
    };
  }

  Future<void> _connect() async {
    setState(() {
      _isConnecting = true;
      _errorMessage = '';
    });

    try {
      final connected = await _sshService.connect(widget.connection);
      
      if (connected) {
        setState(() {
          _isConnected = true;
          _isConnecting = false;
        });

        // Subscribe to SSH output
        _sshService.outputController.stream.listen((output) {
          terminal.write(output);
        });
      } else {
        setState(() {
          _isConnecting = false;
          _errorMessage = 'Failed to connect to SSH server';
        });
      }
    } catch (e) {
      setState(() {
        _isConnecting = false;
        _errorMessage = 'Error: ${e.toString()}';
      });
    }
  }

  @override
  void dispose() {
    _sshService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.connection.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isConnecting ? null : _connect,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isConnecting) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Connecting to SSH server...'),
          ],
        ),
      );
    }

    if (_errorMessage.isNotEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(_errorMessage),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _connect,
              child: const Text('Retry Connection'),
            ),
          ],
        ),
      );
    }

    return TerminalView(
      terminal: terminal,
      style: const TerminalStyle(
        cursorColor: Colors.white,
        cursorWidth: 2,
        fontSize: 16,
      ),
      padding: const EdgeInsets.all(8),
      autofocus: true,
    );
  }
}
```

## Running the App

1. Connect an iOS device or start an iOS simulator
2. Run the application:
```bash
flutter run
```

## Important Notes

1. When distributing via App Store, you'll need to properly explain the network usage in your app review notes
2. Using a physical keyboard with iOS devices will provide the best terminal experience
3. For enhanced security, consider implementing secure storage for credentials using the flutter_secure_storage package
4. You may need to add support for special terminal keys and gestures to improve usability
5. Consider implementing features like connection via SSH key files from iOS Files app