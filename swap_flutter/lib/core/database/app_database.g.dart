// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $TransactionsTableTable extends TransactionsTable
    with TableInfo<$TransactionsTableTable, TransactionEntity> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TransactionsTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _userIdMeta = const VerificationMeta('userId');
  @override
  late final GeneratedColumn<String> userId = GeneratedColumn<String>(
      'user_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _descriptionMeta =
      const VerificationMeta('description');
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
      'description', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _categoryMeta =
      const VerificationMeta('category');
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
      'category', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _currencyCodeMeta =
      const VerificationMeta('currencyCode');
  @override
  late final GeneratedColumn<String> currencyCode = GeneratedColumn<String>(
      'currency_code', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('USD'));
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _recipientIdMeta =
      const VerificationMeta('recipientId');
  @override
  late final GeneratedColumn<String> recipientId = GeneratedColumn<String>(
      'recipient_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _senderIdMeta =
      const VerificationMeta('senderId');
  @override
  late final GeneratedColumn<String> senderId = GeneratedColumn<String>(
      'sender_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _interactionIdMeta =
      const VerificationMeta('interactionId');
  @override
  late final GeneratedColumn<String> interactionId = GeneratedColumn<String>(
      'interaction_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _accountIdMeta =
      const VerificationMeta('accountId');
  @override
  late final GeneratedColumn<String> accountId = GeneratedColumn<String>(
      'account_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _walletIdMeta =
      const VerificationMeta('walletId');
  @override
  late final GeneratedColumn<String> walletId = GeneratedColumn<String>(
      'wallet_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _timestampMeta =
      const VerificationMeta('timestamp');
  @override
  late final GeneratedColumn<int> timestamp = GeneratedColumn<int>(
      'timestamp', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  @override
  late final GeneratedColumnWithTypeConverter<SyncStatus, int> syncStatus =
      GeneratedColumn<int>('sync_status', aliasedName, false,
              type: DriftSqlType.int,
              requiredDuringInsert: false,
              defaultValue: const Constant(1))
          .withConverter<SyncStatus>(
              $TransactionsTableTable.$convertersyncStatus);
  static const VerificationMeta _localIdMeta =
      const VerificationMeta('localId');
  @override
  late final GeneratedColumn<String> localId = GeneratedColumn<String>(
      'local_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _serverTimestampMeta =
      const VerificationMeta('serverTimestamp');
  @override
  late final GeneratedColumn<int> serverTimestamp = GeneratedColumn<int>(
      'server_timestamp', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _metadataMeta =
      const VerificationMeta('metadata');
  @override
  late final GeneratedColumn<String> metadata = GeneratedColumn<String>(
      'metadata', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _externalIdMeta =
      const VerificationMeta('externalId');
  @override
  late final GeneratedColumn<String> externalId = GeneratedColumn<String>(
      'external_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _feesMeta = const VerificationMeta('fees');
  @override
  late final GeneratedColumn<double> fees = GeneratedColumn<double>(
      'fees', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _exchangeRateMeta =
      const VerificationMeta('exchangeRate');
  @override
  late final GeneratedColumn<double> exchangeRate = GeneratedColumn<double>(
      'exchange_rate', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _locationMeta =
      const VerificationMeta('location');
  @override
  late final GeneratedColumn<String> location = GeneratedColumn<String>(
      'location', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _sourceMeta = const VerificationMeta('source');
  @override
  late final GeneratedColumn<String> source = GeneratedColumn<String>(
      'source', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        userId,
        amount,
        description,
        category,
        currencyCode,
        type,
        status,
        recipientId,
        senderId,
        interactionId,
        accountId,
        walletId,
        timestamp,
        createdAt,
        updatedAt,
        syncStatus,
        localId,
        serverTimestamp,
        metadata,
        externalId,
        fees,
        exchangeRate,
        location,
        source
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'transactions_table';
  @override
  VerificationContext validateIntegrity(Insertable<TransactionEntity> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('user_id')) {
      context.handle(_userIdMeta,
          userId.isAcceptableOrUnknown(data['user_id']!, _userIdMeta));
    } else if (isInserting) {
      context.missing(_userIdMeta);
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    } else if (isInserting) {
      context.missing(_amountMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
          _descriptionMeta,
          description.isAcceptableOrUnknown(
              data['description']!, _descriptionMeta));
    } else if (isInserting) {
      context.missing(_descriptionMeta);
    }
    if (data.containsKey('category')) {
      context.handle(_categoryMeta,
          category.isAcceptableOrUnknown(data['category']!, _categoryMeta));
    }
    if (data.containsKey('currency_code')) {
      context.handle(
          _currencyCodeMeta,
          currencyCode.isAcceptableOrUnknown(
              data['currency_code']!, _currencyCodeMeta));
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    } else if (isInserting) {
      context.missing(_typeMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('recipient_id')) {
      context.handle(
          _recipientIdMeta,
          recipientId.isAcceptableOrUnknown(
              data['recipient_id']!, _recipientIdMeta));
    }
    if (data.containsKey('sender_id')) {
      context.handle(_senderIdMeta,
          senderId.isAcceptableOrUnknown(data['sender_id']!, _senderIdMeta));
    }
    if (data.containsKey('interaction_id')) {
      context.handle(
          _interactionIdMeta,
          interactionId.isAcceptableOrUnknown(
              data['interaction_id']!, _interactionIdMeta));
    }
    if (data.containsKey('account_id')) {
      context.handle(_accountIdMeta,
          accountId.isAcceptableOrUnknown(data['account_id']!, _accountIdMeta));
    } else if (isInserting) {
      context.missing(_accountIdMeta);
    }
    if (data.containsKey('wallet_id')) {
      context.handle(_walletIdMeta,
          walletId.isAcceptableOrUnknown(data['wallet_id']!, _walletIdMeta));
    }
    if (data.containsKey('timestamp')) {
      context.handle(_timestampMeta,
          timestamp.isAcceptableOrUnknown(data['timestamp']!, _timestampMeta));
    } else if (isInserting) {
      context.missing(_timestampMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('local_id')) {
      context.handle(_localIdMeta,
          localId.isAcceptableOrUnknown(data['local_id']!, _localIdMeta));
    }
    if (data.containsKey('server_timestamp')) {
      context.handle(
          _serverTimestampMeta,
          serverTimestamp.isAcceptableOrUnknown(
              data['server_timestamp']!, _serverTimestampMeta));
    }
    if (data.containsKey('metadata')) {
      context.handle(_metadataMeta,
          metadata.isAcceptableOrUnknown(data['metadata']!, _metadataMeta));
    }
    if (data.containsKey('external_id')) {
      context.handle(
          _externalIdMeta,
          externalId.isAcceptableOrUnknown(
              data['external_id']!, _externalIdMeta));
    }
    if (data.containsKey('fees')) {
      context.handle(
          _feesMeta, fees.isAcceptableOrUnknown(data['fees']!, _feesMeta));
    }
    if (data.containsKey('exchange_rate')) {
      context.handle(
          _exchangeRateMeta,
          exchangeRate.isAcceptableOrUnknown(
              data['exchange_rate']!, _exchangeRateMeta));
    }
    if (data.containsKey('location')) {
      context.handle(_locationMeta,
          location.isAcceptableOrUnknown(data['location']!, _locationMeta));
    }
    if (data.containsKey('source')) {
      context.handle(_sourceMeta,
          source.isAcceptableOrUnknown(data['source']!, _sourceMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  TransactionEntity map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return TransactionEntity(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      userId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}user_id'])!,
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount'])!,
      description: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}description'])!,
      category: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}category']),
      currencyCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}currency_code'])!,
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      recipientId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}recipient_id']),
      senderId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sender_id']),
      interactionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}interaction_id']),
      accountId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}account_id'])!,
      walletId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wallet_id']),
      timestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}timestamp'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
      syncStatus: $TransactionsTableTable.$convertersyncStatus.fromSql(
          attachedDatabase.typeMapping
              .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!),
      localId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_id']),
      serverTimestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}server_timestamp']),
      metadata: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}metadata']),
      externalId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}external_id']),
      fees: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}fees'])!,
      exchangeRate: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}exchange_rate']),
      location: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}location']),
      source: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}source']),
    );
  }

  @override
  $TransactionsTableTable createAlias(String alias) {
    return $TransactionsTableTable(attachedDatabase, alias);
  }

  static JsonTypeConverter2<SyncStatus, int, int> $convertersyncStatus =
      const EnumIndexConverter<SyncStatus>(SyncStatus.values);
}

class TransactionEntity extends DataClass
    implements Insertable<TransactionEntity> {
  /// Primary key - server-generated ID once synced
  final String id;

  /// User/entity who owns this transaction
  final String userId;

  /// Transaction amount in the base currency
  final double amount;

  /// Transaction description/memo
  final String description;

  /// Transaction category (food, transport, etc.)
  final String? category;

  /// Currency code (USD, EUR, HTG, etc.)
  final String currencyCode;

  /// Transaction type (debit, credit, transfer, etc.)
  final String type;

  /// Transaction status (pending, completed, failed, etc.)
  final String status;

  /// Recipient entity ID (for transfers)
  final String? recipientId;

  /// Sender entity ID (for transfers)
  final String? senderId;

  /// Associated interaction ID (for social payments)
  final String? interactionId;

  /// Account ID this transaction belongs to
  final String accountId;

  /// Wallet ID this transaction affects
  final String? walletId;

  /// Transaction timestamp (milliseconds since epoch)
  final int timestamp;

  /// When this record was created locally
  final int createdAt;

  /// When this record was last updated locally
  final int updatedAt;

  /// Sync status for offline-first architecture
  final SyncStatus syncStatus;

  /// Local ID for offline-created records (UUID)
  final String? localId;

  /// Server-side timestamp for conflict resolution
  final int? serverTimestamp;

  /// Additional metadata as JSON string
  final String? metadata;

  /// External reference ID (for third-party integrations)
  final String? externalId;

  /// Transaction fees
  final double fees;

  /// Exchange rate (if currency conversion involved)
  final double? exchangeRate;

  /// Transaction location (latitude,longitude)
  final String? location;

  /// Device/source that created this transaction
  final String? source;
  const TransactionEntity(
      {required this.id,
      required this.userId,
      required this.amount,
      required this.description,
      this.category,
      required this.currencyCode,
      required this.type,
      required this.status,
      this.recipientId,
      this.senderId,
      this.interactionId,
      required this.accountId,
      this.walletId,
      required this.timestamp,
      required this.createdAt,
      required this.updatedAt,
      required this.syncStatus,
      this.localId,
      this.serverTimestamp,
      this.metadata,
      this.externalId,
      required this.fees,
      this.exchangeRate,
      this.location,
      this.source});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['user_id'] = Variable<String>(userId);
    map['amount'] = Variable<double>(amount);
    map['description'] = Variable<String>(description);
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    map['currency_code'] = Variable<String>(currencyCode);
    map['type'] = Variable<String>(type);
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || recipientId != null) {
      map['recipient_id'] = Variable<String>(recipientId);
    }
    if (!nullToAbsent || senderId != null) {
      map['sender_id'] = Variable<String>(senderId);
    }
    if (!nullToAbsent || interactionId != null) {
      map['interaction_id'] = Variable<String>(interactionId);
    }
    map['account_id'] = Variable<String>(accountId);
    if (!nullToAbsent || walletId != null) {
      map['wallet_id'] = Variable<String>(walletId);
    }
    map['timestamp'] = Variable<int>(timestamp);
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    {
      map['sync_status'] = Variable<int>(
          $TransactionsTableTable.$convertersyncStatus.toSql(syncStatus));
    }
    if (!nullToAbsent || localId != null) {
      map['local_id'] = Variable<String>(localId);
    }
    if (!nullToAbsent || serverTimestamp != null) {
      map['server_timestamp'] = Variable<int>(serverTimestamp);
    }
    if (!nullToAbsent || metadata != null) {
      map['metadata'] = Variable<String>(metadata);
    }
    if (!nullToAbsent || externalId != null) {
      map['external_id'] = Variable<String>(externalId);
    }
    map['fees'] = Variable<double>(fees);
    if (!nullToAbsent || exchangeRate != null) {
      map['exchange_rate'] = Variable<double>(exchangeRate);
    }
    if (!nullToAbsent || location != null) {
      map['location'] = Variable<String>(location);
    }
    if (!nullToAbsent || source != null) {
      map['source'] = Variable<String>(source);
    }
    return map;
  }

  TransactionsTableCompanion toCompanion(bool nullToAbsent) {
    return TransactionsTableCompanion(
      id: Value(id),
      userId: Value(userId),
      amount: Value(amount),
      description: Value(description),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      currencyCode: Value(currencyCode),
      type: Value(type),
      status: Value(status),
      recipientId: recipientId == null && nullToAbsent
          ? const Value.absent()
          : Value(recipientId),
      senderId: senderId == null && nullToAbsent
          ? const Value.absent()
          : Value(senderId),
      interactionId: interactionId == null && nullToAbsent
          ? const Value.absent()
          : Value(interactionId),
      accountId: Value(accountId),
      walletId: walletId == null && nullToAbsent
          ? const Value.absent()
          : Value(walletId),
      timestamp: Value(timestamp),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      syncStatus: Value(syncStatus),
      localId: localId == null && nullToAbsent
          ? const Value.absent()
          : Value(localId),
      serverTimestamp: serverTimestamp == null && nullToAbsent
          ? const Value.absent()
          : Value(serverTimestamp),
      metadata: metadata == null && nullToAbsent
          ? const Value.absent()
          : Value(metadata),
      externalId: externalId == null && nullToAbsent
          ? const Value.absent()
          : Value(externalId),
      fees: Value(fees),
      exchangeRate: exchangeRate == null && nullToAbsent
          ? const Value.absent()
          : Value(exchangeRate),
      location: location == null && nullToAbsent
          ? const Value.absent()
          : Value(location),
      source:
          source == null && nullToAbsent ? const Value.absent() : Value(source),
    );
  }

  factory TransactionEntity.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return TransactionEntity(
      id: serializer.fromJson<String>(json['id']),
      userId: serializer.fromJson<String>(json['userId']),
      amount: serializer.fromJson<double>(json['amount']),
      description: serializer.fromJson<String>(json['description']),
      category: serializer.fromJson<String?>(json['category']),
      currencyCode: serializer.fromJson<String>(json['currencyCode']),
      type: serializer.fromJson<String>(json['type']),
      status: serializer.fromJson<String>(json['status']),
      recipientId: serializer.fromJson<String?>(json['recipientId']),
      senderId: serializer.fromJson<String?>(json['senderId']),
      interactionId: serializer.fromJson<String?>(json['interactionId']),
      accountId: serializer.fromJson<String>(json['accountId']),
      walletId: serializer.fromJson<String?>(json['walletId']),
      timestamp: serializer.fromJson<int>(json['timestamp']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      syncStatus: $TransactionsTableTable.$convertersyncStatus
          .fromJson(serializer.fromJson<int>(json['syncStatus'])),
      localId: serializer.fromJson<String?>(json['localId']),
      serverTimestamp: serializer.fromJson<int?>(json['serverTimestamp']),
      metadata: serializer.fromJson<String?>(json['metadata']),
      externalId: serializer.fromJson<String?>(json['externalId']),
      fees: serializer.fromJson<double>(json['fees']),
      exchangeRate: serializer.fromJson<double?>(json['exchangeRate']),
      location: serializer.fromJson<String?>(json['location']),
      source: serializer.fromJson<String?>(json['source']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'userId': serializer.toJson<String>(userId),
      'amount': serializer.toJson<double>(amount),
      'description': serializer.toJson<String>(description),
      'category': serializer.toJson<String?>(category),
      'currencyCode': serializer.toJson<String>(currencyCode),
      'type': serializer.toJson<String>(type),
      'status': serializer.toJson<String>(status),
      'recipientId': serializer.toJson<String?>(recipientId),
      'senderId': serializer.toJson<String?>(senderId),
      'interactionId': serializer.toJson<String?>(interactionId),
      'accountId': serializer.toJson<String>(accountId),
      'walletId': serializer.toJson<String?>(walletId),
      'timestamp': serializer.toJson<int>(timestamp),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'syncStatus': serializer.toJson<int>(
          $TransactionsTableTable.$convertersyncStatus.toJson(syncStatus)),
      'localId': serializer.toJson<String?>(localId),
      'serverTimestamp': serializer.toJson<int?>(serverTimestamp),
      'metadata': serializer.toJson<String?>(metadata),
      'externalId': serializer.toJson<String?>(externalId),
      'fees': serializer.toJson<double>(fees),
      'exchangeRate': serializer.toJson<double?>(exchangeRate),
      'location': serializer.toJson<String?>(location),
      'source': serializer.toJson<String?>(source),
    };
  }

  TransactionEntity copyWith(
          {String? id,
          String? userId,
          double? amount,
          String? description,
          Value<String?> category = const Value.absent(),
          String? currencyCode,
          String? type,
          String? status,
          Value<String?> recipientId = const Value.absent(),
          Value<String?> senderId = const Value.absent(),
          Value<String?> interactionId = const Value.absent(),
          String? accountId,
          Value<String?> walletId = const Value.absent(),
          int? timestamp,
          int? createdAt,
          int? updatedAt,
          SyncStatus? syncStatus,
          Value<String?> localId = const Value.absent(),
          Value<int?> serverTimestamp = const Value.absent(),
          Value<String?> metadata = const Value.absent(),
          Value<String?> externalId = const Value.absent(),
          double? fees,
          Value<double?> exchangeRate = const Value.absent(),
          Value<String?> location = const Value.absent(),
          Value<String?> source = const Value.absent()}) =>
      TransactionEntity(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        amount: amount ?? this.amount,
        description: description ?? this.description,
        category: category.present ? category.value : this.category,
        currencyCode: currencyCode ?? this.currencyCode,
        type: type ?? this.type,
        status: status ?? this.status,
        recipientId: recipientId.present ? recipientId.value : this.recipientId,
        senderId: senderId.present ? senderId.value : this.senderId,
        interactionId:
            interactionId.present ? interactionId.value : this.interactionId,
        accountId: accountId ?? this.accountId,
        walletId: walletId.present ? walletId.value : this.walletId,
        timestamp: timestamp ?? this.timestamp,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        syncStatus: syncStatus ?? this.syncStatus,
        localId: localId.present ? localId.value : this.localId,
        serverTimestamp: serverTimestamp.present
            ? serverTimestamp.value
            : this.serverTimestamp,
        metadata: metadata.present ? metadata.value : this.metadata,
        externalId: externalId.present ? externalId.value : this.externalId,
        fees: fees ?? this.fees,
        exchangeRate:
            exchangeRate.present ? exchangeRate.value : this.exchangeRate,
        location: location.present ? location.value : this.location,
        source: source.present ? source.value : this.source,
      );
  TransactionEntity copyWithCompanion(TransactionsTableCompanion data) {
    return TransactionEntity(
      id: data.id.present ? data.id.value : this.id,
      userId: data.userId.present ? data.userId.value : this.userId,
      amount: data.amount.present ? data.amount.value : this.amount,
      description:
          data.description.present ? data.description.value : this.description,
      category: data.category.present ? data.category.value : this.category,
      currencyCode: data.currencyCode.present
          ? data.currencyCode.value
          : this.currencyCode,
      type: data.type.present ? data.type.value : this.type,
      status: data.status.present ? data.status.value : this.status,
      recipientId:
          data.recipientId.present ? data.recipientId.value : this.recipientId,
      senderId: data.senderId.present ? data.senderId.value : this.senderId,
      interactionId: data.interactionId.present
          ? data.interactionId.value
          : this.interactionId,
      accountId: data.accountId.present ? data.accountId.value : this.accountId,
      walletId: data.walletId.present ? data.walletId.value : this.walletId,
      timestamp: data.timestamp.present ? data.timestamp.value : this.timestamp,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      localId: data.localId.present ? data.localId.value : this.localId,
      serverTimestamp: data.serverTimestamp.present
          ? data.serverTimestamp.value
          : this.serverTimestamp,
      metadata: data.metadata.present ? data.metadata.value : this.metadata,
      externalId:
          data.externalId.present ? data.externalId.value : this.externalId,
      fees: data.fees.present ? data.fees.value : this.fees,
      exchangeRate: data.exchangeRate.present
          ? data.exchangeRate.value
          : this.exchangeRate,
      location: data.location.present ? data.location.value : this.location,
      source: data.source.present ? data.source.value : this.source,
    );
  }

  @override
  String toString() {
    return (StringBuffer('TransactionEntity(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('amount: $amount, ')
          ..write('description: $description, ')
          ..write('category: $category, ')
          ..write('currencyCode: $currencyCode, ')
          ..write('type: $type, ')
          ..write('status: $status, ')
          ..write('recipientId: $recipientId, ')
          ..write('senderId: $senderId, ')
          ..write('interactionId: $interactionId, ')
          ..write('accountId: $accountId, ')
          ..write('walletId: $walletId, ')
          ..write('timestamp: $timestamp, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('localId: $localId, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('metadata: $metadata, ')
          ..write('externalId: $externalId, ')
          ..write('fees: $fees, ')
          ..write('exchangeRate: $exchangeRate, ')
          ..write('location: $location, ')
          ..write('source: $source')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        userId,
        amount,
        description,
        category,
        currencyCode,
        type,
        status,
        recipientId,
        senderId,
        interactionId,
        accountId,
        walletId,
        timestamp,
        createdAt,
        updatedAt,
        syncStatus,
        localId,
        serverTimestamp,
        metadata,
        externalId,
        fees,
        exchangeRate,
        location,
        source
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is TransactionEntity &&
          other.id == this.id &&
          other.userId == this.userId &&
          other.amount == this.amount &&
          other.description == this.description &&
          other.category == this.category &&
          other.currencyCode == this.currencyCode &&
          other.type == this.type &&
          other.status == this.status &&
          other.recipientId == this.recipientId &&
          other.senderId == this.senderId &&
          other.interactionId == this.interactionId &&
          other.accountId == this.accountId &&
          other.walletId == this.walletId &&
          other.timestamp == this.timestamp &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.syncStatus == this.syncStatus &&
          other.localId == this.localId &&
          other.serverTimestamp == this.serverTimestamp &&
          other.metadata == this.metadata &&
          other.externalId == this.externalId &&
          other.fees == this.fees &&
          other.exchangeRate == this.exchangeRate &&
          other.location == this.location &&
          other.source == this.source);
}

class TransactionsTableCompanion extends UpdateCompanion<TransactionEntity> {
  final Value<String> id;
  final Value<String> userId;
  final Value<double> amount;
  final Value<String> description;
  final Value<String?> category;
  final Value<String> currencyCode;
  final Value<String> type;
  final Value<String> status;
  final Value<String?> recipientId;
  final Value<String?> senderId;
  final Value<String?> interactionId;
  final Value<String> accountId;
  final Value<String?> walletId;
  final Value<int> timestamp;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<SyncStatus> syncStatus;
  final Value<String?> localId;
  final Value<int?> serverTimestamp;
  final Value<String?> metadata;
  final Value<String?> externalId;
  final Value<double> fees;
  final Value<double?> exchangeRate;
  final Value<String?> location;
  final Value<String?> source;
  final Value<int> rowid;
  const TransactionsTableCompanion({
    this.id = const Value.absent(),
    this.userId = const Value.absent(),
    this.amount = const Value.absent(),
    this.description = const Value.absent(),
    this.category = const Value.absent(),
    this.currencyCode = const Value.absent(),
    this.type = const Value.absent(),
    this.status = const Value.absent(),
    this.recipientId = const Value.absent(),
    this.senderId = const Value.absent(),
    this.interactionId = const Value.absent(),
    this.accountId = const Value.absent(),
    this.walletId = const Value.absent(),
    this.timestamp = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.localId = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.metadata = const Value.absent(),
    this.externalId = const Value.absent(),
    this.fees = const Value.absent(),
    this.exchangeRate = const Value.absent(),
    this.location = const Value.absent(),
    this.source = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TransactionsTableCompanion.insert({
    required String id,
    required String userId,
    required double amount,
    required String description,
    this.category = const Value.absent(),
    this.currencyCode = const Value.absent(),
    required String type,
    this.status = const Value.absent(),
    this.recipientId = const Value.absent(),
    this.senderId = const Value.absent(),
    this.interactionId = const Value.absent(),
    required String accountId,
    this.walletId = const Value.absent(),
    required int timestamp,
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.localId = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.metadata = const Value.absent(),
    this.externalId = const Value.absent(),
    this.fees = const Value.absent(),
    this.exchangeRate = const Value.absent(),
    this.location = const Value.absent(),
    this.source = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        userId = Value(userId),
        amount = Value(amount),
        description = Value(description),
        type = Value(type),
        accountId = Value(accountId),
        timestamp = Value(timestamp);
  static Insertable<TransactionEntity> custom({
    Expression<String>? id,
    Expression<String>? userId,
    Expression<double>? amount,
    Expression<String>? description,
    Expression<String>? category,
    Expression<String>? currencyCode,
    Expression<String>? type,
    Expression<String>? status,
    Expression<String>? recipientId,
    Expression<String>? senderId,
    Expression<String>? interactionId,
    Expression<String>? accountId,
    Expression<String>? walletId,
    Expression<int>? timestamp,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? syncStatus,
    Expression<String>? localId,
    Expression<int>? serverTimestamp,
    Expression<String>? metadata,
    Expression<String>? externalId,
    Expression<double>? fees,
    Expression<double>? exchangeRate,
    Expression<String>? location,
    Expression<String>? source,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (userId != null) 'user_id': userId,
      if (amount != null) 'amount': amount,
      if (description != null) 'description': description,
      if (category != null) 'category': category,
      if (currencyCode != null) 'currency_code': currencyCode,
      if (type != null) 'type': type,
      if (status != null) 'status': status,
      if (recipientId != null) 'recipient_id': recipientId,
      if (senderId != null) 'sender_id': senderId,
      if (interactionId != null) 'interaction_id': interactionId,
      if (accountId != null) 'account_id': accountId,
      if (walletId != null) 'wallet_id': walletId,
      if (timestamp != null) 'timestamp': timestamp,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (localId != null) 'local_id': localId,
      if (serverTimestamp != null) 'server_timestamp': serverTimestamp,
      if (metadata != null) 'metadata': metadata,
      if (externalId != null) 'external_id': externalId,
      if (fees != null) 'fees': fees,
      if (exchangeRate != null) 'exchange_rate': exchangeRate,
      if (location != null) 'location': location,
      if (source != null) 'source': source,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TransactionsTableCompanion copyWith(
      {Value<String>? id,
      Value<String>? userId,
      Value<double>? amount,
      Value<String>? description,
      Value<String?>? category,
      Value<String>? currencyCode,
      Value<String>? type,
      Value<String>? status,
      Value<String?>? recipientId,
      Value<String?>? senderId,
      Value<String?>? interactionId,
      Value<String>? accountId,
      Value<String?>? walletId,
      Value<int>? timestamp,
      Value<int>? createdAt,
      Value<int>? updatedAt,
      Value<SyncStatus>? syncStatus,
      Value<String?>? localId,
      Value<int?>? serverTimestamp,
      Value<String?>? metadata,
      Value<String?>? externalId,
      Value<double>? fees,
      Value<double?>? exchangeRate,
      Value<String?>? location,
      Value<String?>? source,
      Value<int>? rowid}) {
    return TransactionsTableCompanion(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      amount: amount ?? this.amount,
      description: description ?? this.description,
      category: category ?? this.category,
      currencyCode: currencyCode ?? this.currencyCode,
      type: type ?? this.type,
      status: status ?? this.status,
      recipientId: recipientId ?? this.recipientId,
      senderId: senderId ?? this.senderId,
      interactionId: interactionId ?? this.interactionId,
      accountId: accountId ?? this.accountId,
      walletId: walletId ?? this.walletId,
      timestamp: timestamp ?? this.timestamp,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
      localId: localId ?? this.localId,
      serverTimestamp: serverTimestamp ?? this.serverTimestamp,
      metadata: metadata ?? this.metadata,
      externalId: externalId ?? this.externalId,
      fees: fees ?? this.fees,
      exchangeRate: exchangeRate ?? this.exchangeRate,
      location: location ?? this.location,
      source: source ?? this.source,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (userId.present) {
      map['user_id'] = Variable<String>(userId.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (currencyCode.present) {
      map['currency_code'] = Variable<String>(currencyCode.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (recipientId.present) {
      map['recipient_id'] = Variable<String>(recipientId.value);
    }
    if (senderId.present) {
      map['sender_id'] = Variable<String>(senderId.value);
    }
    if (interactionId.present) {
      map['interaction_id'] = Variable<String>(interactionId.value);
    }
    if (accountId.present) {
      map['account_id'] = Variable<String>(accountId.value);
    }
    if (walletId.present) {
      map['wallet_id'] = Variable<String>(walletId.value);
    }
    if (timestamp.present) {
      map['timestamp'] = Variable<int>(timestamp.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(
          $TransactionsTableTable.$convertersyncStatus.toSql(syncStatus.value));
    }
    if (localId.present) {
      map['local_id'] = Variable<String>(localId.value);
    }
    if (serverTimestamp.present) {
      map['server_timestamp'] = Variable<int>(serverTimestamp.value);
    }
    if (metadata.present) {
      map['metadata'] = Variable<String>(metadata.value);
    }
    if (externalId.present) {
      map['external_id'] = Variable<String>(externalId.value);
    }
    if (fees.present) {
      map['fees'] = Variable<double>(fees.value);
    }
    if (exchangeRate.present) {
      map['exchange_rate'] = Variable<double>(exchangeRate.value);
    }
    if (location.present) {
      map['location'] = Variable<String>(location.value);
    }
    if (source.present) {
      map['source'] = Variable<String>(source.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TransactionsTableCompanion(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('amount: $amount, ')
          ..write('description: $description, ')
          ..write('category: $category, ')
          ..write('currencyCode: $currencyCode, ')
          ..write('type: $type, ')
          ..write('status: $status, ')
          ..write('recipientId: $recipientId, ')
          ..write('senderId: $senderId, ')
          ..write('interactionId: $interactionId, ')
          ..write('accountId: $accountId, ')
          ..write('walletId: $walletId, ')
          ..write('timestamp: $timestamp, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('localId: $localId, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('metadata: $metadata, ')
          ..write('externalId: $externalId, ')
          ..write('fees: $fees, ')
          ..write('exchangeRate: $exchangeRate, ')
          ..write('location: $location, ')
          ..write('source: $source, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $BalancesTableTable extends BalancesTable
    with TableInfo<$BalancesTableTable, BalanceEntity> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $BalancesTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _userIdMeta = const VerificationMeta('userId');
  @override
  late final GeneratedColumn<String> userId = GeneratedColumn<String>(
      'user_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _accountIdMeta =
      const VerificationMeta('accountId');
  @override
  late final GeneratedColumn<String> accountId = GeneratedColumn<String>(
      'account_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _currencyCodeMeta =
      const VerificationMeta('currencyCode');
  @override
  late final GeneratedColumn<String> currencyCode = GeneratedColumn<String>(
      'currency_code', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _availableAmountMeta =
      const VerificationMeta('availableAmount');
  @override
  late final GeneratedColumn<double> availableAmount = GeneratedColumn<double>(
      'available_amount', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _pendingAmountMeta =
      const VerificationMeta('pendingAmount');
  @override
  late final GeneratedColumn<double> pendingAmount = GeneratedColumn<double>(
      'pending_amount', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _holdAmountMeta =
      const VerificationMeta('holdAmount');
  @override
  late final GeneratedColumn<double> holdAmount = GeneratedColumn<double>(
      'hold_amount', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _lastUpdatedMeta =
      const VerificationMeta('lastUpdated');
  @override
  late final GeneratedColumn<int> lastUpdated = GeneratedColumn<int>(
      'last_updated', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  @override
  late final GeneratedColumnWithTypeConverter<SyncStatus, int> syncStatus =
      GeneratedColumn<int>('sync_status', aliasedName, false,
              type: DriftSqlType.int,
              requiredDuringInsert: false,
              defaultValue: const Constant(0))
          .withConverter<SyncStatus>($BalancesTableTable.$convertersyncStatus);
  static const VerificationMeta _serverTimestampMeta =
      const VerificationMeta('serverTimestamp');
  @override
  late final GeneratedColumn<int> serverTimestamp = GeneratedColumn<int>(
      'server_timestamp', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _walletIdMeta =
      const VerificationMeta('walletId');
  @override
  late final GeneratedColumn<String> walletId = GeneratedColumn<String>(
      'wallet_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _balanceTypeMeta =
      const VerificationMeta('balanceType');
  @override
  late final GeneratedColumn<String> balanceType = GeneratedColumn<String>(
      'balance_type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('checking'));
  static const VerificationMeta _isPrimaryMeta =
      const VerificationMeta('isPrimary');
  @override
  late final GeneratedColumn<bool> isPrimary = GeneratedColumn<bool>(
      'is_primary', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_primary" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _metadataMeta =
      const VerificationMeta('metadata');
  @override
  late final GeneratedColumn<String> metadata = GeneratedColumn<String>(
      'metadata', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _interestRateMeta =
      const VerificationMeta('interestRate');
  @override
  late final GeneratedColumn<double> interestRate = GeneratedColumn<double>(
      'interest_rate', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _creditLimitMeta =
      const VerificationMeta('creditLimit');
  @override
  late final GeneratedColumn<double> creditLimit = GeneratedColumn<double>(
      'credit_limit', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _minimumBalanceMeta =
      const VerificationMeta('minimumBalance');
  @override
  late final GeneratedColumn<double> minimumBalance = GeneratedColumn<double>(
      'minimum_balance', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  @override
  List<GeneratedColumn> get $columns => [
        userId,
        accountId,
        currencyCode,
        amount,
        availableAmount,
        pendingAmount,
        holdAmount,
        lastUpdated,
        createdAt,
        updatedAt,
        syncStatus,
        serverTimestamp,
        walletId,
        balanceType,
        isPrimary,
        metadata,
        interestRate,
        creditLimit,
        minimumBalance
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'balances_table';
  @override
  VerificationContext validateIntegrity(Insertable<BalanceEntity> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('user_id')) {
      context.handle(_userIdMeta,
          userId.isAcceptableOrUnknown(data['user_id']!, _userIdMeta));
    } else if (isInserting) {
      context.missing(_userIdMeta);
    }
    if (data.containsKey('account_id')) {
      context.handle(_accountIdMeta,
          accountId.isAcceptableOrUnknown(data['account_id']!, _accountIdMeta));
    } else if (isInserting) {
      context.missing(_accountIdMeta);
    }
    if (data.containsKey('currency_code')) {
      context.handle(
          _currencyCodeMeta,
          currencyCode.isAcceptableOrUnknown(
              data['currency_code']!, _currencyCodeMeta));
    } else if (isInserting) {
      context.missing(_currencyCodeMeta);
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    }
    if (data.containsKey('available_amount')) {
      context.handle(
          _availableAmountMeta,
          availableAmount.isAcceptableOrUnknown(
              data['available_amount']!, _availableAmountMeta));
    }
    if (data.containsKey('pending_amount')) {
      context.handle(
          _pendingAmountMeta,
          pendingAmount.isAcceptableOrUnknown(
              data['pending_amount']!, _pendingAmountMeta));
    }
    if (data.containsKey('hold_amount')) {
      context.handle(
          _holdAmountMeta,
          holdAmount.isAcceptableOrUnknown(
              data['hold_amount']!, _holdAmountMeta));
    }
    if (data.containsKey('last_updated')) {
      context.handle(
          _lastUpdatedMeta,
          lastUpdated.isAcceptableOrUnknown(
              data['last_updated']!, _lastUpdatedMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('server_timestamp')) {
      context.handle(
          _serverTimestampMeta,
          serverTimestamp.isAcceptableOrUnknown(
              data['server_timestamp']!, _serverTimestampMeta));
    }
    if (data.containsKey('wallet_id')) {
      context.handle(_walletIdMeta,
          walletId.isAcceptableOrUnknown(data['wallet_id']!, _walletIdMeta));
    }
    if (data.containsKey('balance_type')) {
      context.handle(
          _balanceTypeMeta,
          balanceType.isAcceptableOrUnknown(
              data['balance_type']!, _balanceTypeMeta));
    }
    if (data.containsKey('is_primary')) {
      context.handle(_isPrimaryMeta,
          isPrimary.isAcceptableOrUnknown(data['is_primary']!, _isPrimaryMeta));
    }
    if (data.containsKey('metadata')) {
      context.handle(_metadataMeta,
          metadata.isAcceptableOrUnknown(data['metadata']!, _metadataMeta));
    }
    if (data.containsKey('interest_rate')) {
      context.handle(
          _interestRateMeta,
          interestRate.isAcceptableOrUnknown(
              data['interest_rate']!, _interestRateMeta));
    }
    if (data.containsKey('credit_limit')) {
      context.handle(
          _creditLimitMeta,
          creditLimit.isAcceptableOrUnknown(
              data['credit_limit']!, _creditLimitMeta));
    }
    if (data.containsKey('minimum_balance')) {
      context.handle(
          _minimumBalanceMeta,
          minimumBalance.isAcceptableOrUnknown(
              data['minimum_balance']!, _minimumBalanceMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {userId, accountId, currencyCode};
  @override
  BalanceEntity map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return BalanceEntity(
      userId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}user_id'])!,
      accountId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}account_id'])!,
      currencyCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}currency_code'])!,
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount'])!,
      availableAmount: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}available_amount'])!,
      pendingAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}pending_amount'])!,
      holdAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}hold_amount'])!,
      lastUpdated: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}last_updated'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
      syncStatus: $BalancesTableTable.$convertersyncStatus.fromSql(
          attachedDatabase.typeMapping
              .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!),
      serverTimestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}server_timestamp']),
      walletId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wallet_id']),
      balanceType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}balance_type'])!,
      isPrimary: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_primary'])!,
      metadata: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}metadata']),
      interestRate: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}interest_rate']),
      creditLimit: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}credit_limit']),
      minimumBalance: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}minimum_balance'])!,
    );
  }

  @override
  $BalancesTableTable createAlias(String alias) {
    return $BalancesTableTable(attachedDatabase, alias);
  }

  static JsonTypeConverter2<SyncStatus, int, int> $convertersyncStatus =
      const EnumIndexConverter<SyncStatus>(SyncStatus.values);
}

class BalanceEntity extends DataClass implements Insertable<BalanceEntity> {
  /// Composite primary key: userId + accountId + currencyCode
  final String userId;

  /// Account ID this balance belongs to
  final String accountId;

  /// Currency code (USD, EUR, HTG, etc.)
  final String currencyCode;

  /// Current balance amount
  final double amount;

  /// Available balance (amount minus holds/pending)
  final double availableAmount;

  /// Pending balance (incoming transactions not yet cleared)
  final double pendingAmount;

  /// Balance holds (reserved amounts)
  final double holdAmount;

  /// When this balance was last updated (milliseconds since epoch)
  final int lastUpdated;

  /// When this record was created locally
  final int createdAt;

  /// When this record was last updated locally
  final int updatedAt;

  /// Sync status for offline-first architecture
  final SyncStatus syncStatus;

  /// Server-side timestamp for conflict resolution
  final int? serverTimestamp;

  /// Wallet ID if this balance is wallet-specific
  final String? walletId;

  /// Balance type (checking, savings, credit, etc.)
  final String balanceType;

  /// Whether this balance is the primary balance for the account
  final bool isPrimary;

  /// Additional metadata as JSON string
  final String? metadata;

  /// Interest rate (if applicable)
  final double? interestRate;

  /// Credit limit (if applicable)
  final double? creditLimit;

  /// Minimum balance requirement
  final double minimumBalance;
  const BalanceEntity(
      {required this.userId,
      required this.accountId,
      required this.currencyCode,
      required this.amount,
      required this.availableAmount,
      required this.pendingAmount,
      required this.holdAmount,
      required this.lastUpdated,
      required this.createdAt,
      required this.updatedAt,
      required this.syncStatus,
      this.serverTimestamp,
      this.walletId,
      required this.balanceType,
      required this.isPrimary,
      this.metadata,
      this.interestRate,
      this.creditLimit,
      required this.minimumBalance});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['user_id'] = Variable<String>(userId);
    map['account_id'] = Variable<String>(accountId);
    map['currency_code'] = Variable<String>(currencyCode);
    map['amount'] = Variable<double>(amount);
    map['available_amount'] = Variable<double>(availableAmount);
    map['pending_amount'] = Variable<double>(pendingAmount);
    map['hold_amount'] = Variable<double>(holdAmount);
    map['last_updated'] = Variable<int>(lastUpdated);
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    {
      map['sync_status'] = Variable<int>(
          $BalancesTableTable.$convertersyncStatus.toSql(syncStatus));
    }
    if (!nullToAbsent || serverTimestamp != null) {
      map['server_timestamp'] = Variable<int>(serverTimestamp);
    }
    if (!nullToAbsent || walletId != null) {
      map['wallet_id'] = Variable<String>(walletId);
    }
    map['balance_type'] = Variable<String>(balanceType);
    map['is_primary'] = Variable<bool>(isPrimary);
    if (!nullToAbsent || metadata != null) {
      map['metadata'] = Variable<String>(metadata);
    }
    if (!nullToAbsent || interestRate != null) {
      map['interest_rate'] = Variable<double>(interestRate);
    }
    if (!nullToAbsent || creditLimit != null) {
      map['credit_limit'] = Variable<double>(creditLimit);
    }
    map['minimum_balance'] = Variable<double>(minimumBalance);
    return map;
  }

  BalancesTableCompanion toCompanion(bool nullToAbsent) {
    return BalancesTableCompanion(
      userId: Value(userId),
      accountId: Value(accountId),
      currencyCode: Value(currencyCode),
      amount: Value(amount),
      availableAmount: Value(availableAmount),
      pendingAmount: Value(pendingAmount),
      holdAmount: Value(holdAmount),
      lastUpdated: Value(lastUpdated),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      syncStatus: Value(syncStatus),
      serverTimestamp: serverTimestamp == null && nullToAbsent
          ? const Value.absent()
          : Value(serverTimestamp),
      walletId: walletId == null && nullToAbsent
          ? const Value.absent()
          : Value(walletId),
      balanceType: Value(balanceType),
      isPrimary: Value(isPrimary),
      metadata: metadata == null && nullToAbsent
          ? const Value.absent()
          : Value(metadata),
      interestRate: interestRate == null && nullToAbsent
          ? const Value.absent()
          : Value(interestRate),
      creditLimit: creditLimit == null && nullToAbsent
          ? const Value.absent()
          : Value(creditLimit),
      minimumBalance: Value(minimumBalance),
    );
  }

  factory BalanceEntity.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return BalanceEntity(
      userId: serializer.fromJson<String>(json['userId']),
      accountId: serializer.fromJson<String>(json['accountId']),
      currencyCode: serializer.fromJson<String>(json['currencyCode']),
      amount: serializer.fromJson<double>(json['amount']),
      availableAmount: serializer.fromJson<double>(json['availableAmount']),
      pendingAmount: serializer.fromJson<double>(json['pendingAmount']),
      holdAmount: serializer.fromJson<double>(json['holdAmount']),
      lastUpdated: serializer.fromJson<int>(json['lastUpdated']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      syncStatus: $BalancesTableTable.$convertersyncStatus
          .fromJson(serializer.fromJson<int>(json['syncStatus'])),
      serverTimestamp: serializer.fromJson<int?>(json['serverTimestamp']),
      walletId: serializer.fromJson<String?>(json['walletId']),
      balanceType: serializer.fromJson<String>(json['balanceType']),
      isPrimary: serializer.fromJson<bool>(json['isPrimary']),
      metadata: serializer.fromJson<String?>(json['metadata']),
      interestRate: serializer.fromJson<double?>(json['interestRate']),
      creditLimit: serializer.fromJson<double?>(json['creditLimit']),
      minimumBalance: serializer.fromJson<double>(json['minimumBalance']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'userId': serializer.toJson<String>(userId),
      'accountId': serializer.toJson<String>(accountId),
      'currencyCode': serializer.toJson<String>(currencyCode),
      'amount': serializer.toJson<double>(amount),
      'availableAmount': serializer.toJson<double>(availableAmount),
      'pendingAmount': serializer.toJson<double>(pendingAmount),
      'holdAmount': serializer.toJson<double>(holdAmount),
      'lastUpdated': serializer.toJson<int>(lastUpdated),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'syncStatus': serializer.toJson<int>(
          $BalancesTableTable.$convertersyncStatus.toJson(syncStatus)),
      'serverTimestamp': serializer.toJson<int?>(serverTimestamp),
      'walletId': serializer.toJson<String?>(walletId),
      'balanceType': serializer.toJson<String>(balanceType),
      'isPrimary': serializer.toJson<bool>(isPrimary),
      'metadata': serializer.toJson<String?>(metadata),
      'interestRate': serializer.toJson<double?>(interestRate),
      'creditLimit': serializer.toJson<double?>(creditLimit),
      'minimumBalance': serializer.toJson<double>(minimumBalance),
    };
  }

  BalanceEntity copyWith(
          {String? userId,
          String? accountId,
          String? currencyCode,
          double? amount,
          double? availableAmount,
          double? pendingAmount,
          double? holdAmount,
          int? lastUpdated,
          int? createdAt,
          int? updatedAt,
          SyncStatus? syncStatus,
          Value<int?> serverTimestamp = const Value.absent(),
          Value<String?> walletId = const Value.absent(),
          String? balanceType,
          bool? isPrimary,
          Value<String?> metadata = const Value.absent(),
          Value<double?> interestRate = const Value.absent(),
          Value<double?> creditLimit = const Value.absent(),
          double? minimumBalance}) =>
      BalanceEntity(
        userId: userId ?? this.userId,
        accountId: accountId ?? this.accountId,
        currencyCode: currencyCode ?? this.currencyCode,
        amount: amount ?? this.amount,
        availableAmount: availableAmount ?? this.availableAmount,
        pendingAmount: pendingAmount ?? this.pendingAmount,
        holdAmount: holdAmount ?? this.holdAmount,
        lastUpdated: lastUpdated ?? this.lastUpdated,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        syncStatus: syncStatus ?? this.syncStatus,
        serverTimestamp: serverTimestamp.present
            ? serverTimestamp.value
            : this.serverTimestamp,
        walletId: walletId.present ? walletId.value : this.walletId,
        balanceType: balanceType ?? this.balanceType,
        isPrimary: isPrimary ?? this.isPrimary,
        metadata: metadata.present ? metadata.value : this.metadata,
        interestRate:
            interestRate.present ? interestRate.value : this.interestRate,
        creditLimit: creditLimit.present ? creditLimit.value : this.creditLimit,
        minimumBalance: minimumBalance ?? this.minimumBalance,
      );
  BalanceEntity copyWithCompanion(BalancesTableCompanion data) {
    return BalanceEntity(
      userId: data.userId.present ? data.userId.value : this.userId,
      accountId: data.accountId.present ? data.accountId.value : this.accountId,
      currencyCode: data.currencyCode.present
          ? data.currencyCode.value
          : this.currencyCode,
      amount: data.amount.present ? data.amount.value : this.amount,
      availableAmount: data.availableAmount.present
          ? data.availableAmount.value
          : this.availableAmount,
      pendingAmount: data.pendingAmount.present
          ? data.pendingAmount.value
          : this.pendingAmount,
      holdAmount:
          data.holdAmount.present ? data.holdAmount.value : this.holdAmount,
      lastUpdated:
          data.lastUpdated.present ? data.lastUpdated.value : this.lastUpdated,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      serverTimestamp: data.serverTimestamp.present
          ? data.serverTimestamp.value
          : this.serverTimestamp,
      walletId: data.walletId.present ? data.walletId.value : this.walletId,
      balanceType:
          data.balanceType.present ? data.balanceType.value : this.balanceType,
      isPrimary: data.isPrimary.present ? data.isPrimary.value : this.isPrimary,
      metadata: data.metadata.present ? data.metadata.value : this.metadata,
      interestRate: data.interestRate.present
          ? data.interestRate.value
          : this.interestRate,
      creditLimit:
          data.creditLimit.present ? data.creditLimit.value : this.creditLimit,
      minimumBalance: data.minimumBalance.present
          ? data.minimumBalance.value
          : this.minimumBalance,
    );
  }

  @override
  String toString() {
    return (StringBuffer('BalanceEntity(')
          ..write('userId: $userId, ')
          ..write('accountId: $accountId, ')
          ..write('currencyCode: $currencyCode, ')
          ..write('amount: $amount, ')
          ..write('availableAmount: $availableAmount, ')
          ..write('pendingAmount: $pendingAmount, ')
          ..write('holdAmount: $holdAmount, ')
          ..write('lastUpdated: $lastUpdated, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('walletId: $walletId, ')
          ..write('balanceType: $balanceType, ')
          ..write('isPrimary: $isPrimary, ')
          ..write('metadata: $metadata, ')
          ..write('interestRate: $interestRate, ')
          ..write('creditLimit: $creditLimit, ')
          ..write('minimumBalance: $minimumBalance')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      userId,
      accountId,
      currencyCode,
      amount,
      availableAmount,
      pendingAmount,
      holdAmount,
      lastUpdated,
      createdAt,
      updatedAt,
      syncStatus,
      serverTimestamp,
      walletId,
      balanceType,
      isPrimary,
      metadata,
      interestRate,
      creditLimit,
      minimumBalance);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is BalanceEntity &&
          other.userId == this.userId &&
          other.accountId == this.accountId &&
          other.currencyCode == this.currencyCode &&
          other.amount == this.amount &&
          other.availableAmount == this.availableAmount &&
          other.pendingAmount == this.pendingAmount &&
          other.holdAmount == this.holdAmount &&
          other.lastUpdated == this.lastUpdated &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.syncStatus == this.syncStatus &&
          other.serverTimestamp == this.serverTimestamp &&
          other.walletId == this.walletId &&
          other.balanceType == this.balanceType &&
          other.isPrimary == this.isPrimary &&
          other.metadata == this.metadata &&
          other.interestRate == this.interestRate &&
          other.creditLimit == this.creditLimit &&
          other.minimumBalance == this.minimumBalance);
}

class BalancesTableCompanion extends UpdateCompanion<BalanceEntity> {
  final Value<String> userId;
  final Value<String> accountId;
  final Value<String> currencyCode;
  final Value<double> amount;
  final Value<double> availableAmount;
  final Value<double> pendingAmount;
  final Value<double> holdAmount;
  final Value<int> lastUpdated;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<SyncStatus> syncStatus;
  final Value<int?> serverTimestamp;
  final Value<String?> walletId;
  final Value<String> balanceType;
  final Value<bool> isPrimary;
  final Value<String?> metadata;
  final Value<double?> interestRate;
  final Value<double?> creditLimit;
  final Value<double> minimumBalance;
  final Value<int> rowid;
  const BalancesTableCompanion({
    this.userId = const Value.absent(),
    this.accountId = const Value.absent(),
    this.currencyCode = const Value.absent(),
    this.amount = const Value.absent(),
    this.availableAmount = const Value.absent(),
    this.pendingAmount = const Value.absent(),
    this.holdAmount = const Value.absent(),
    this.lastUpdated = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.walletId = const Value.absent(),
    this.balanceType = const Value.absent(),
    this.isPrimary = const Value.absent(),
    this.metadata = const Value.absent(),
    this.interestRate = const Value.absent(),
    this.creditLimit = const Value.absent(),
    this.minimumBalance = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  BalancesTableCompanion.insert({
    required String userId,
    required String accountId,
    required String currencyCode,
    this.amount = const Value.absent(),
    this.availableAmount = const Value.absent(),
    this.pendingAmount = const Value.absent(),
    this.holdAmount = const Value.absent(),
    this.lastUpdated = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.walletId = const Value.absent(),
    this.balanceType = const Value.absent(),
    this.isPrimary = const Value.absent(),
    this.metadata = const Value.absent(),
    this.interestRate = const Value.absent(),
    this.creditLimit = const Value.absent(),
    this.minimumBalance = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : userId = Value(userId),
        accountId = Value(accountId),
        currencyCode = Value(currencyCode);
  static Insertable<BalanceEntity> custom({
    Expression<String>? userId,
    Expression<String>? accountId,
    Expression<String>? currencyCode,
    Expression<double>? amount,
    Expression<double>? availableAmount,
    Expression<double>? pendingAmount,
    Expression<double>? holdAmount,
    Expression<int>? lastUpdated,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? syncStatus,
    Expression<int>? serverTimestamp,
    Expression<String>? walletId,
    Expression<String>? balanceType,
    Expression<bool>? isPrimary,
    Expression<String>? metadata,
    Expression<double>? interestRate,
    Expression<double>? creditLimit,
    Expression<double>? minimumBalance,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (userId != null) 'user_id': userId,
      if (accountId != null) 'account_id': accountId,
      if (currencyCode != null) 'currency_code': currencyCode,
      if (amount != null) 'amount': amount,
      if (availableAmount != null) 'available_amount': availableAmount,
      if (pendingAmount != null) 'pending_amount': pendingAmount,
      if (holdAmount != null) 'hold_amount': holdAmount,
      if (lastUpdated != null) 'last_updated': lastUpdated,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (serverTimestamp != null) 'server_timestamp': serverTimestamp,
      if (walletId != null) 'wallet_id': walletId,
      if (balanceType != null) 'balance_type': balanceType,
      if (isPrimary != null) 'is_primary': isPrimary,
      if (metadata != null) 'metadata': metadata,
      if (interestRate != null) 'interest_rate': interestRate,
      if (creditLimit != null) 'credit_limit': creditLimit,
      if (minimumBalance != null) 'minimum_balance': minimumBalance,
      if (rowid != null) 'rowid': rowid,
    });
  }

  BalancesTableCompanion copyWith(
      {Value<String>? userId,
      Value<String>? accountId,
      Value<String>? currencyCode,
      Value<double>? amount,
      Value<double>? availableAmount,
      Value<double>? pendingAmount,
      Value<double>? holdAmount,
      Value<int>? lastUpdated,
      Value<int>? createdAt,
      Value<int>? updatedAt,
      Value<SyncStatus>? syncStatus,
      Value<int?>? serverTimestamp,
      Value<String?>? walletId,
      Value<String>? balanceType,
      Value<bool>? isPrimary,
      Value<String?>? metadata,
      Value<double?>? interestRate,
      Value<double?>? creditLimit,
      Value<double>? minimumBalance,
      Value<int>? rowid}) {
    return BalancesTableCompanion(
      userId: userId ?? this.userId,
      accountId: accountId ?? this.accountId,
      currencyCode: currencyCode ?? this.currencyCode,
      amount: amount ?? this.amount,
      availableAmount: availableAmount ?? this.availableAmount,
      pendingAmount: pendingAmount ?? this.pendingAmount,
      holdAmount: holdAmount ?? this.holdAmount,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
      serverTimestamp: serverTimestamp ?? this.serverTimestamp,
      walletId: walletId ?? this.walletId,
      balanceType: balanceType ?? this.balanceType,
      isPrimary: isPrimary ?? this.isPrimary,
      metadata: metadata ?? this.metadata,
      interestRate: interestRate ?? this.interestRate,
      creditLimit: creditLimit ?? this.creditLimit,
      minimumBalance: minimumBalance ?? this.minimumBalance,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (userId.present) {
      map['user_id'] = Variable<String>(userId.value);
    }
    if (accountId.present) {
      map['account_id'] = Variable<String>(accountId.value);
    }
    if (currencyCode.present) {
      map['currency_code'] = Variable<String>(currencyCode.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (availableAmount.present) {
      map['available_amount'] = Variable<double>(availableAmount.value);
    }
    if (pendingAmount.present) {
      map['pending_amount'] = Variable<double>(pendingAmount.value);
    }
    if (holdAmount.present) {
      map['hold_amount'] = Variable<double>(holdAmount.value);
    }
    if (lastUpdated.present) {
      map['last_updated'] = Variable<int>(lastUpdated.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(
          $BalancesTableTable.$convertersyncStatus.toSql(syncStatus.value));
    }
    if (serverTimestamp.present) {
      map['server_timestamp'] = Variable<int>(serverTimestamp.value);
    }
    if (walletId.present) {
      map['wallet_id'] = Variable<String>(walletId.value);
    }
    if (balanceType.present) {
      map['balance_type'] = Variable<String>(balanceType.value);
    }
    if (isPrimary.present) {
      map['is_primary'] = Variable<bool>(isPrimary.value);
    }
    if (metadata.present) {
      map['metadata'] = Variable<String>(metadata.value);
    }
    if (interestRate.present) {
      map['interest_rate'] = Variable<double>(interestRate.value);
    }
    if (creditLimit.present) {
      map['credit_limit'] = Variable<double>(creditLimit.value);
    }
    if (minimumBalance.present) {
      map['minimum_balance'] = Variable<double>(minimumBalance.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('BalancesTableCompanion(')
          ..write('userId: $userId, ')
          ..write('accountId: $accountId, ')
          ..write('currencyCode: $currencyCode, ')
          ..write('amount: $amount, ')
          ..write('availableAmount: $availableAmount, ')
          ..write('pendingAmount: $pendingAmount, ')
          ..write('holdAmount: $holdAmount, ')
          ..write('lastUpdated: $lastUpdated, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('walletId: $walletId, ')
          ..write('balanceType: $balanceType, ')
          ..write('isPrimary: $isPrimary, ')
          ..write('metadata: $metadata, ')
          ..write('interestRate: $interestRate, ')
          ..write('creditLimit: $creditLimit, ')
          ..write('minimumBalance: $minimumBalance, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $MessagesTableTable extends MessagesTable
    with TableInfo<$MessagesTableTable, MessageEntity> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MessagesTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _interactionIdMeta =
      const VerificationMeta('interactionId');
  @override
  late final GeneratedColumn<String> interactionId = GeneratedColumn<String>(
      'interaction_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _senderEntityIdMeta =
      const VerificationMeta('senderEntityId');
  @override
  late final GeneratedColumn<String> senderEntityId = GeneratedColumn<String>(
      'sender_entity_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _contentMeta =
      const VerificationMeta('content');
  @override
  late final GeneratedColumn<String> content = GeneratedColumn<String>(
      'content', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('text'));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('sending'));
  static const VerificationMeta _timestampMeta =
      const VerificationMeta('timestamp');
  @override
  late final GeneratedColumn<int> timestamp = GeneratedColumn<int>(
      'timestamp', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  @override
  late final GeneratedColumnWithTypeConverter<SyncStatus, int> syncStatus =
      GeneratedColumn<int>('sync_status', aliasedName, false,
              type: DriftSqlType.int,
              requiredDuringInsert: false,
              defaultValue: const Constant(1))
          .withConverter<SyncStatus>($MessagesTableTable.$convertersyncStatus);
  static const VerificationMeta _localIdMeta =
      const VerificationMeta('localId');
  @override
  late final GeneratedColumn<String> localId = GeneratedColumn<String>(
      'local_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _serverTimestampMeta =
      const VerificationMeta('serverTimestamp');
  @override
  late final GeneratedColumn<int> serverTimestamp = GeneratedColumn<int>(
      'server_timestamp', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _isOptimisticMeta =
      const VerificationMeta('isOptimistic');
  @override
  late final GeneratedColumn<bool> isOptimistic = GeneratedColumn<bool>(
      'is_optimistic', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_optimistic" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _replyToMessageIdMeta =
      const VerificationMeta('replyToMessageId');
  @override
  late final GeneratedColumn<String> replyToMessageId = GeneratedColumn<String>(
      'reply_to_message_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _transactionIdMeta =
      const VerificationMeta('transactionId');
  @override
  late final GeneratedColumn<String> transactionId = GeneratedColumn<String>(
      'transaction_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _metadataMeta =
      const VerificationMeta('metadata');
  @override
  late final GeneratedColumn<String> metadata = GeneratedColumn<String>(
      'metadata', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _editedAtMeta =
      const VerificationMeta('editedAt');
  @override
  late final GeneratedColumn<int> editedAt = GeneratedColumn<int>(
      'edited_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _isEditedMeta =
      const VerificationMeta('isEdited');
  @override
  late final GeneratedColumn<bool> isEdited = GeneratedColumn<bool>(
      'is_edited', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_edited" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _isDeletedMeta =
      const VerificationMeta('isDeleted');
  @override
  late final GeneratedColumn<bool> isDeleted = GeneratedColumn<bool>(
      'is_deleted', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_deleted" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _deletedAtMeta =
      const VerificationMeta('deletedAt');
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
      'deleted_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _deliveredAtMeta =
      const VerificationMeta('deliveredAt');
  @override
  late final GeneratedColumn<int> deliveredAt = GeneratedColumn<int>(
      'delivered_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _readAtMeta = const VerificationMeta('readAt');
  @override
  late final GeneratedColumn<int> readAt = GeneratedColumn<int>(
      'read_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _reactionsMeta =
      const VerificationMeta('reactions');
  @override
  late final GeneratedColumn<String> reactions = GeneratedColumn<String>(
      'reactions', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _priorityMeta =
      const VerificationMeta('priority');
  @override
  late final GeneratedColumn<String> priority = GeneratedColumn<String>(
      'priority', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('normal'));
  static const VerificationMeta _encryptionKeyIdMeta =
      const VerificationMeta('encryptionKeyId');
  @override
  late final GeneratedColumn<String> encryptionKeyId = GeneratedColumn<String>(
      'encryption_key_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _sequenceNumberMeta =
      const VerificationMeta('sequenceNumber');
  @override
  late final GeneratedColumn<int> sequenceNumber = GeneratedColumn<int>(
      'sequence_number', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        interactionId,
        senderEntityId,
        content,
        type,
        status,
        timestamp,
        createdAt,
        updatedAt,
        syncStatus,
        localId,
        serverTimestamp,
        isOptimistic,
        replyToMessageId,
        transactionId,
        metadata,
        editedAt,
        isEdited,
        isDeleted,
        deletedAt,
        deliveredAt,
        readAt,
        reactions,
        priority,
        encryptionKeyId,
        sequenceNumber
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'messages_table';
  @override
  VerificationContext validateIntegrity(Insertable<MessageEntity> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('interaction_id')) {
      context.handle(
          _interactionIdMeta,
          interactionId.isAcceptableOrUnknown(
              data['interaction_id']!, _interactionIdMeta));
    } else if (isInserting) {
      context.missing(_interactionIdMeta);
    }
    if (data.containsKey('sender_entity_id')) {
      context.handle(
          _senderEntityIdMeta,
          senderEntityId.isAcceptableOrUnknown(
              data['sender_entity_id']!, _senderEntityIdMeta));
    } else if (isInserting) {
      context.missing(_senderEntityIdMeta);
    }
    if (data.containsKey('content')) {
      context.handle(_contentMeta,
          content.isAcceptableOrUnknown(data['content']!, _contentMeta));
    } else if (isInserting) {
      context.missing(_contentMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('timestamp')) {
      context.handle(_timestampMeta,
          timestamp.isAcceptableOrUnknown(data['timestamp']!, _timestampMeta));
    } else if (isInserting) {
      context.missing(_timestampMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('local_id')) {
      context.handle(_localIdMeta,
          localId.isAcceptableOrUnknown(data['local_id']!, _localIdMeta));
    }
    if (data.containsKey('server_timestamp')) {
      context.handle(
          _serverTimestampMeta,
          serverTimestamp.isAcceptableOrUnknown(
              data['server_timestamp']!, _serverTimestampMeta));
    }
    if (data.containsKey('is_optimistic')) {
      context.handle(
          _isOptimisticMeta,
          isOptimistic.isAcceptableOrUnknown(
              data['is_optimistic']!, _isOptimisticMeta));
    }
    if (data.containsKey('reply_to_message_id')) {
      context.handle(
          _replyToMessageIdMeta,
          replyToMessageId.isAcceptableOrUnknown(
              data['reply_to_message_id']!, _replyToMessageIdMeta));
    }
    if (data.containsKey('transaction_id')) {
      context.handle(
          _transactionIdMeta,
          transactionId.isAcceptableOrUnknown(
              data['transaction_id']!, _transactionIdMeta));
    }
    if (data.containsKey('metadata')) {
      context.handle(_metadataMeta,
          metadata.isAcceptableOrUnknown(data['metadata']!, _metadataMeta));
    }
    if (data.containsKey('edited_at')) {
      context.handle(_editedAtMeta,
          editedAt.isAcceptableOrUnknown(data['edited_at']!, _editedAtMeta));
    }
    if (data.containsKey('is_edited')) {
      context.handle(_isEditedMeta,
          isEdited.isAcceptableOrUnknown(data['is_edited']!, _isEditedMeta));
    }
    if (data.containsKey('is_deleted')) {
      context.handle(_isDeletedMeta,
          isDeleted.isAcceptableOrUnknown(data['is_deleted']!, _isDeletedMeta));
    }
    if (data.containsKey('deleted_at')) {
      context.handle(_deletedAtMeta,
          deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta));
    }
    if (data.containsKey('delivered_at')) {
      context.handle(
          _deliveredAtMeta,
          deliveredAt.isAcceptableOrUnknown(
              data['delivered_at']!, _deliveredAtMeta));
    }
    if (data.containsKey('read_at')) {
      context.handle(_readAtMeta,
          readAt.isAcceptableOrUnknown(data['read_at']!, _readAtMeta));
    }
    if (data.containsKey('reactions')) {
      context.handle(_reactionsMeta,
          reactions.isAcceptableOrUnknown(data['reactions']!, _reactionsMeta));
    }
    if (data.containsKey('priority')) {
      context.handle(_priorityMeta,
          priority.isAcceptableOrUnknown(data['priority']!, _priorityMeta));
    }
    if (data.containsKey('encryption_key_id')) {
      context.handle(
          _encryptionKeyIdMeta,
          encryptionKeyId.isAcceptableOrUnknown(
              data['encryption_key_id']!, _encryptionKeyIdMeta));
    }
    if (data.containsKey('sequence_number')) {
      context.handle(
          _sequenceNumberMeta,
          sequenceNumber.isAcceptableOrUnknown(
              data['sequence_number']!, _sequenceNumberMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  MessageEntity map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MessageEntity(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      interactionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}interaction_id'])!,
      senderEntityId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}sender_entity_id'])!,
      content: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}content'])!,
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      timestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}timestamp'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
      syncStatus: $MessagesTableTable.$convertersyncStatus.fromSql(
          attachedDatabase.typeMapping
              .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!),
      localId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_id']),
      serverTimestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}server_timestamp']),
      isOptimistic: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_optimistic'])!,
      replyToMessageId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}reply_to_message_id']),
      transactionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}transaction_id']),
      metadata: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}metadata']),
      editedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}edited_at']),
      isEdited: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_edited'])!,
      isDeleted: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_deleted'])!,
      deletedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}deleted_at']),
      deliveredAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}delivered_at']),
      readAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}read_at']),
      reactions: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}reactions']),
      priority: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}priority'])!,
      encryptionKeyId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}encryption_key_id']),
      sequenceNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sequence_number']),
    );
  }

  @override
  $MessagesTableTable createAlias(String alias) {
    return $MessagesTableTable(attachedDatabase, alias);
  }

  static JsonTypeConverter2<SyncStatus, int, int> $convertersyncStatus =
      const EnumIndexConverter<SyncStatus>(SyncStatus.values);
}

class MessageEntity extends DataClass implements Insertable<MessageEntity> {
  /// Primary key - server-generated ID once synced
  final String id;

  /// Interaction ID this message belongs to
  final String interactionId;

  /// Entity ID of the message sender
  final String senderEntityId;

  /// Message content/text
  final String content;

  /// Message type (text, image, transaction, system, etc.)
  final String type;

  /// Message status (sending, sent, delivered, read, failed)
  final String status;

  /// Message timestamp (milliseconds since epoch)
  final int timestamp;

  /// When this record was created locally
  final int createdAt;

  /// When this record was last updated locally
  final int updatedAt;

  /// Sync status for offline-first architecture
  final SyncStatus syncStatus;

  /// Local ID for offline-created records (UUID)
  final String? localId;

  /// Server-side timestamp for conflict resolution
  final int? serverTimestamp;

  /// Whether this is an optimistic message (not yet confirmed by server)
  final bool isOptimistic;

  /// Reply to message ID (for threaded conversations)
  final String? replyToMessageId;

  /// Associated transaction ID (for payment messages)
  final String? transactionId;

  /// Message metadata as JSON string (attachments, formatting, etc.)
  final String? metadata;

  /// Edited timestamp (if message was edited)
  final int? editedAt;

  /// Whether this message was edited
  final bool isEdited;

  /// Whether this message was deleted
  final bool isDeleted;

  /// Deleted timestamp
  final int? deletedAt;

  /// Message delivery timestamp
  final int? deliveredAt;

  /// Message read timestamp
  final int? readAt;

  /// Message reactions as JSON string
  final String? reactions;

  /// Message priority (normal, high, urgent)
  final String priority;

  /// Encryption key ID (for encrypted messages)
  final String? encryptionKeyId;

  /// Message sequence number within interaction
  final int? sequenceNumber;
  const MessageEntity(
      {required this.id,
      required this.interactionId,
      required this.senderEntityId,
      required this.content,
      required this.type,
      required this.status,
      required this.timestamp,
      required this.createdAt,
      required this.updatedAt,
      required this.syncStatus,
      this.localId,
      this.serverTimestamp,
      required this.isOptimistic,
      this.replyToMessageId,
      this.transactionId,
      this.metadata,
      this.editedAt,
      required this.isEdited,
      required this.isDeleted,
      this.deletedAt,
      this.deliveredAt,
      this.readAt,
      this.reactions,
      required this.priority,
      this.encryptionKeyId,
      this.sequenceNumber});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['interaction_id'] = Variable<String>(interactionId);
    map['sender_entity_id'] = Variable<String>(senderEntityId);
    map['content'] = Variable<String>(content);
    map['type'] = Variable<String>(type);
    map['status'] = Variable<String>(status);
    map['timestamp'] = Variable<int>(timestamp);
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    {
      map['sync_status'] = Variable<int>(
          $MessagesTableTable.$convertersyncStatus.toSql(syncStatus));
    }
    if (!nullToAbsent || localId != null) {
      map['local_id'] = Variable<String>(localId);
    }
    if (!nullToAbsent || serverTimestamp != null) {
      map['server_timestamp'] = Variable<int>(serverTimestamp);
    }
    map['is_optimistic'] = Variable<bool>(isOptimistic);
    if (!nullToAbsent || replyToMessageId != null) {
      map['reply_to_message_id'] = Variable<String>(replyToMessageId);
    }
    if (!nullToAbsent || transactionId != null) {
      map['transaction_id'] = Variable<String>(transactionId);
    }
    if (!nullToAbsent || metadata != null) {
      map['metadata'] = Variable<String>(metadata);
    }
    if (!nullToAbsent || editedAt != null) {
      map['edited_at'] = Variable<int>(editedAt);
    }
    map['is_edited'] = Variable<bool>(isEdited);
    map['is_deleted'] = Variable<bool>(isDeleted);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    if (!nullToAbsent || deliveredAt != null) {
      map['delivered_at'] = Variable<int>(deliveredAt);
    }
    if (!nullToAbsent || readAt != null) {
      map['read_at'] = Variable<int>(readAt);
    }
    if (!nullToAbsent || reactions != null) {
      map['reactions'] = Variable<String>(reactions);
    }
    map['priority'] = Variable<String>(priority);
    if (!nullToAbsent || encryptionKeyId != null) {
      map['encryption_key_id'] = Variable<String>(encryptionKeyId);
    }
    if (!nullToAbsent || sequenceNumber != null) {
      map['sequence_number'] = Variable<int>(sequenceNumber);
    }
    return map;
  }

  MessagesTableCompanion toCompanion(bool nullToAbsent) {
    return MessagesTableCompanion(
      id: Value(id),
      interactionId: Value(interactionId),
      senderEntityId: Value(senderEntityId),
      content: Value(content),
      type: Value(type),
      status: Value(status),
      timestamp: Value(timestamp),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      syncStatus: Value(syncStatus),
      localId: localId == null && nullToAbsent
          ? const Value.absent()
          : Value(localId),
      serverTimestamp: serverTimestamp == null && nullToAbsent
          ? const Value.absent()
          : Value(serverTimestamp),
      isOptimistic: Value(isOptimistic),
      replyToMessageId: replyToMessageId == null && nullToAbsent
          ? const Value.absent()
          : Value(replyToMessageId),
      transactionId: transactionId == null && nullToAbsent
          ? const Value.absent()
          : Value(transactionId),
      metadata: metadata == null && nullToAbsent
          ? const Value.absent()
          : Value(metadata),
      editedAt: editedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(editedAt),
      isEdited: Value(isEdited),
      isDeleted: Value(isDeleted),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      deliveredAt: deliveredAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deliveredAt),
      readAt:
          readAt == null && nullToAbsent ? const Value.absent() : Value(readAt),
      reactions: reactions == null && nullToAbsent
          ? const Value.absent()
          : Value(reactions),
      priority: Value(priority),
      encryptionKeyId: encryptionKeyId == null && nullToAbsent
          ? const Value.absent()
          : Value(encryptionKeyId),
      sequenceNumber: sequenceNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(sequenceNumber),
    );
  }

  factory MessageEntity.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MessageEntity(
      id: serializer.fromJson<String>(json['id']),
      interactionId: serializer.fromJson<String>(json['interactionId']),
      senderEntityId: serializer.fromJson<String>(json['senderEntityId']),
      content: serializer.fromJson<String>(json['content']),
      type: serializer.fromJson<String>(json['type']),
      status: serializer.fromJson<String>(json['status']),
      timestamp: serializer.fromJson<int>(json['timestamp']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      syncStatus: $MessagesTableTable.$convertersyncStatus
          .fromJson(serializer.fromJson<int>(json['syncStatus'])),
      localId: serializer.fromJson<String?>(json['localId']),
      serverTimestamp: serializer.fromJson<int?>(json['serverTimestamp']),
      isOptimistic: serializer.fromJson<bool>(json['isOptimistic']),
      replyToMessageId: serializer.fromJson<String?>(json['replyToMessageId']),
      transactionId: serializer.fromJson<String?>(json['transactionId']),
      metadata: serializer.fromJson<String?>(json['metadata']),
      editedAt: serializer.fromJson<int?>(json['editedAt']),
      isEdited: serializer.fromJson<bool>(json['isEdited']),
      isDeleted: serializer.fromJson<bool>(json['isDeleted']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      deliveredAt: serializer.fromJson<int?>(json['deliveredAt']),
      readAt: serializer.fromJson<int?>(json['readAt']),
      reactions: serializer.fromJson<String?>(json['reactions']),
      priority: serializer.fromJson<String>(json['priority']),
      encryptionKeyId: serializer.fromJson<String?>(json['encryptionKeyId']),
      sequenceNumber: serializer.fromJson<int?>(json['sequenceNumber']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'interactionId': serializer.toJson<String>(interactionId),
      'senderEntityId': serializer.toJson<String>(senderEntityId),
      'content': serializer.toJson<String>(content),
      'type': serializer.toJson<String>(type),
      'status': serializer.toJson<String>(status),
      'timestamp': serializer.toJson<int>(timestamp),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'syncStatus': serializer.toJson<int>(
          $MessagesTableTable.$convertersyncStatus.toJson(syncStatus)),
      'localId': serializer.toJson<String?>(localId),
      'serverTimestamp': serializer.toJson<int?>(serverTimestamp),
      'isOptimistic': serializer.toJson<bool>(isOptimistic),
      'replyToMessageId': serializer.toJson<String?>(replyToMessageId),
      'transactionId': serializer.toJson<String?>(transactionId),
      'metadata': serializer.toJson<String?>(metadata),
      'editedAt': serializer.toJson<int?>(editedAt),
      'isEdited': serializer.toJson<bool>(isEdited),
      'isDeleted': serializer.toJson<bool>(isDeleted),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'deliveredAt': serializer.toJson<int?>(deliveredAt),
      'readAt': serializer.toJson<int?>(readAt),
      'reactions': serializer.toJson<String?>(reactions),
      'priority': serializer.toJson<String>(priority),
      'encryptionKeyId': serializer.toJson<String?>(encryptionKeyId),
      'sequenceNumber': serializer.toJson<int?>(sequenceNumber),
    };
  }

  MessageEntity copyWith(
          {String? id,
          String? interactionId,
          String? senderEntityId,
          String? content,
          String? type,
          String? status,
          int? timestamp,
          int? createdAt,
          int? updatedAt,
          SyncStatus? syncStatus,
          Value<String?> localId = const Value.absent(),
          Value<int?> serverTimestamp = const Value.absent(),
          bool? isOptimistic,
          Value<String?> replyToMessageId = const Value.absent(),
          Value<String?> transactionId = const Value.absent(),
          Value<String?> metadata = const Value.absent(),
          Value<int?> editedAt = const Value.absent(),
          bool? isEdited,
          bool? isDeleted,
          Value<int?> deletedAt = const Value.absent(),
          Value<int?> deliveredAt = const Value.absent(),
          Value<int?> readAt = const Value.absent(),
          Value<String?> reactions = const Value.absent(),
          String? priority,
          Value<String?> encryptionKeyId = const Value.absent(),
          Value<int?> sequenceNumber = const Value.absent()}) =>
      MessageEntity(
        id: id ?? this.id,
        interactionId: interactionId ?? this.interactionId,
        senderEntityId: senderEntityId ?? this.senderEntityId,
        content: content ?? this.content,
        type: type ?? this.type,
        status: status ?? this.status,
        timestamp: timestamp ?? this.timestamp,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        syncStatus: syncStatus ?? this.syncStatus,
        localId: localId.present ? localId.value : this.localId,
        serverTimestamp: serverTimestamp.present
            ? serverTimestamp.value
            : this.serverTimestamp,
        isOptimistic: isOptimistic ?? this.isOptimistic,
        replyToMessageId: replyToMessageId.present
            ? replyToMessageId.value
            : this.replyToMessageId,
        transactionId:
            transactionId.present ? transactionId.value : this.transactionId,
        metadata: metadata.present ? metadata.value : this.metadata,
        editedAt: editedAt.present ? editedAt.value : this.editedAt,
        isEdited: isEdited ?? this.isEdited,
        isDeleted: isDeleted ?? this.isDeleted,
        deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
        deliveredAt: deliveredAt.present ? deliveredAt.value : this.deliveredAt,
        readAt: readAt.present ? readAt.value : this.readAt,
        reactions: reactions.present ? reactions.value : this.reactions,
        priority: priority ?? this.priority,
        encryptionKeyId: encryptionKeyId.present
            ? encryptionKeyId.value
            : this.encryptionKeyId,
        sequenceNumber:
            sequenceNumber.present ? sequenceNumber.value : this.sequenceNumber,
      );
  MessageEntity copyWithCompanion(MessagesTableCompanion data) {
    return MessageEntity(
      id: data.id.present ? data.id.value : this.id,
      interactionId: data.interactionId.present
          ? data.interactionId.value
          : this.interactionId,
      senderEntityId: data.senderEntityId.present
          ? data.senderEntityId.value
          : this.senderEntityId,
      content: data.content.present ? data.content.value : this.content,
      type: data.type.present ? data.type.value : this.type,
      status: data.status.present ? data.status.value : this.status,
      timestamp: data.timestamp.present ? data.timestamp.value : this.timestamp,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      localId: data.localId.present ? data.localId.value : this.localId,
      serverTimestamp: data.serverTimestamp.present
          ? data.serverTimestamp.value
          : this.serverTimestamp,
      isOptimistic: data.isOptimistic.present
          ? data.isOptimistic.value
          : this.isOptimistic,
      replyToMessageId: data.replyToMessageId.present
          ? data.replyToMessageId.value
          : this.replyToMessageId,
      transactionId: data.transactionId.present
          ? data.transactionId.value
          : this.transactionId,
      metadata: data.metadata.present ? data.metadata.value : this.metadata,
      editedAt: data.editedAt.present ? data.editedAt.value : this.editedAt,
      isEdited: data.isEdited.present ? data.isEdited.value : this.isEdited,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      deliveredAt:
          data.deliveredAt.present ? data.deliveredAt.value : this.deliveredAt,
      readAt: data.readAt.present ? data.readAt.value : this.readAt,
      reactions: data.reactions.present ? data.reactions.value : this.reactions,
      priority: data.priority.present ? data.priority.value : this.priority,
      encryptionKeyId: data.encryptionKeyId.present
          ? data.encryptionKeyId.value
          : this.encryptionKeyId,
      sequenceNumber: data.sequenceNumber.present
          ? data.sequenceNumber.value
          : this.sequenceNumber,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MessageEntity(')
          ..write('id: $id, ')
          ..write('interactionId: $interactionId, ')
          ..write('senderEntityId: $senderEntityId, ')
          ..write('content: $content, ')
          ..write('type: $type, ')
          ..write('status: $status, ')
          ..write('timestamp: $timestamp, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('localId: $localId, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('isOptimistic: $isOptimistic, ')
          ..write('replyToMessageId: $replyToMessageId, ')
          ..write('transactionId: $transactionId, ')
          ..write('metadata: $metadata, ')
          ..write('editedAt: $editedAt, ')
          ..write('isEdited: $isEdited, ')
          ..write('isDeleted: $isDeleted, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('deliveredAt: $deliveredAt, ')
          ..write('readAt: $readAt, ')
          ..write('reactions: $reactions, ')
          ..write('priority: $priority, ')
          ..write('encryptionKeyId: $encryptionKeyId, ')
          ..write('sequenceNumber: $sequenceNumber')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        interactionId,
        senderEntityId,
        content,
        type,
        status,
        timestamp,
        createdAt,
        updatedAt,
        syncStatus,
        localId,
        serverTimestamp,
        isOptimistic,
        replyToMessageId,
        transactionId,
        metadata,
        editedAt,
        isEdited,
        isDeleted,
        deletedAt,
        deliveredAt,
        readAt,
        reactions,
        priority,
        encryptionKeyId,
        sequenceNumber
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MessageEntity &&
          other.id == this.id &&
          other.interactionId == this.interactionId &&
          other.senderEntityId == this.senderEntityId &&
          other.content == this.content &&
          other.type == this.type &&
          other.status == this.status &&
          other.timestamp == this.timestamp &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.syncStatus == this.syncStatus &&
          other.localId == this.localId &&
          other.serverTimestamp == this.serverTimestamp &&
          other.isOptimistic == this.isOptimistic &&
          other.replyToMessageId == this.replyToMessageId &&
          other.transactionId == this.transactionId &&
          other.metadata == this.metadata &&
          other.editedAt == this.editedAt &&
          other.isEdited == this.isEdited &&
          other.isDeleted == this.isDeleted &&
          other.deletedAt == this.deletedAt &&
          other.deliveredAt == this.deliveredAt &&
          other.readAt == this.readAt &&
          other.reactions == this.reactions &&
          other.priority == this.priority &&
          other.encryptionKeyId == this.encryptionKeyId &&
          other.sequenceNumber == this.sequenceNumber);
}

class MessagesTableCompanion extends UpdateCompanion<MessageEntity> {
  final Value<String> id;
  final Value<String> interactionId;
  final Value<String> senderEntityId;
  final Value<String> content;
  final Value<String> type;
  final Value<String> status;
  final Value<int> timestamp;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<SyncStatus> syncStatus;
  final Value<String?> localId;
  final Value<int?> serverTimestamp;
  final Value<bool> isOptimistic;
  final Value<String?> replyToMessageId;
  final Value<String?> transactionId;
  final Value<String?> metadata;
  final Value<int?> editedAt;
  final Value<bool> isEdited;
  final Value<bool> isDeleted;
  final Value<int?> deletedAt;
  final Value<int?> deliveredAt;
  final Value<int?> readAt;
  final Value<String?> reactions;
  final Value<String> priority;
  final Value<String?> encryptionKeyId;
  final Value<int?> sequenceNumber;
  final Value<int> rowid;
  const MessagesTableCompanion({
    this.id = const Value.absent(),
    this.interactionId = const Value.absent(),
    this.senderEntityId = const Value.absent(),
    this.content = const Value.absent(),
    this.type = const Value.absent(),
    this.status = const Value.absent(),
    this.timestamp = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.localId = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.isOptimistic = const Value.absent(),
    this.replyToMessageId = const Value.absent(),
    this.transactionId = const Value.absent(),
    this.metadata = const Value.absent(),
    this.editedAt = const Value.absent(),
    this.isEdited = const Value.absent(),
    this.isDeleted = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.deliveredAt = const Value.absent(),
    this.readAt = const Value.absent(),
    this.reactions = const Value.absent(),
    this.priority = const Value.absent(),
    this.encryptionKeyId = const Value.absent(),
    this.sequenceNumber = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  MessagesTableCompanion.insert({
    required String id,
    required String interactionId,
    required String senderEntityId,
    required String content,
    this.type = const Value.absent(),
    this.status = const Value.absent(),
    required int timestamp,
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.localId = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.isOptimistic = const Value.absent(),
    this.replyToMessageId = const Value.absent(),
    this.transactionId = const Value.absent(),
    this.metadata = const Value.absent(),
    this.editedAt = const Value.absent(),
    this.isEdited = const Value.absent(),
    this.isDeleted = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.deliveredAt = const Value.absent(),
    this.readAt = const Value.absent(),
    this.reactions = const Value.absent(),
    this.priority = const Value.absent(),
    this.encryptionKeyId = const Value.absent(),
    this.sequenceNumber = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        interactionId = Value(interactionId),
        senderEntityId = Value(senderEntityId),
        content = Value(content),
        timestamp = Value(timestamp);
  static Insertable<MessageEntity> custom({
    Expression<String>? id,
    Expression<String>? interactionId,
    Expression<String>? senderEntityId,
    Expression<String>? content,
    Expression<String>? type,
    Expression<String>? status,
    Expression<int>? timestamp,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? syncStatus,
    Expression<String>? localId,
    Expression<int>? serverTimestamp,
    Expression<bool>? isOptimistic,
    Expression<String>? replyToMessageId,
    Expression<String>? transactionId,
    Expression<String>? metadata,
    Expression<int>? editedAt,
    Expression<bool>? isEdited,
    Expression<bool>? isDeleted,
    Expression<int>? deletedAt,
    Expression<int>? deliveredAt,
    Expression<int>? readAt,
    Expression<String>? reactions,
    Expression<String>? priority,
    Expression<String>? encryptionKeyId,
    Expression<int>? sequenceNumber,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (interactionId != null) 'interaction_id': interactionId,
      if (senderEntityId != null) 'sender_entity_id': senderEntityId,
      if (content != null) 'content': content,
      if (type != null) 'type': type,
      if (status != null) 'status': status,
      if (timestamp != null) 'timestamp': timestamp,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (localId != null) 'local_id': localId,
      if (serverTimestamp != null) 'server_timestamp': serverTimestamp,
      if (isOptimistic != null) 'is_optimistic': isOptimistic,
      if (replyToMessageId != null) 'reply_to_message_id': replyToMessageId,
      if (transactionId != null) 'transaction_id': transactionId,
      if (metadata != null) 'metadata': metadata,
      if (editedAt != null) 'edited_at': editedAt,
      if (isEdited != null) 'is_edited': isEdited,
      if (isDeleted != null) 'is_deleted': isDeleted,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (deliveredAt != null) 'delivered_at': deliveredAt,
      if (readAt != null) 'read_at': readAt,
      if (reactions != null) 'reactions': reactions,
      if (priority != null) 'priority': priority,
      if (encryptionKeyId != null) 'encryption_key_id': encryptionKeyId,
      if (sequenceNumber != null) 'sequence_number': sequenceNumber,
      if (rowid != null) 'rowid': rowid,
    });
  }

  MessagesTableCompanion copyWith(
      {Value<String>? id,
      Value<String>? interactionId,
      Value<String>? senderEntityId,
      Value<String>? content,
      Value<String>? type,
      Value<String>? status,
      Value<int>? timestamp,
      Value<int>? createdAt,
      Value<int>? updatedAt,
      Value<SyncStatus>? syncStatus,
      Value<String?>? localId,
      Value<int?>? serverTimestamp,
      Value<bool>? isOptimistic,
      Value<String?>? replyToMessageId,
      Value<String?>? transactionId,
      Value<String?>? metadata,
      Value<int?>? editedAt,
      Value<bool>? isEdited,
      Value<bool>? isDeleted,
      Value<int?>? deletedAt,
      Value<int?>? deliveredAt,
      Value<int?>? readAt,
      Value<String?>? reactions,
      Value<String>? priority,
      Value<String?>? encryptionKeyId,
      Value<int?>? sequenceNumber,
      Value<int>? rowid}) {
    return MessagesTableCompanion(
      id: id ?? this.id,
      interactionId: interactionId ?? this.interactionId,
      senderEntityId: senderEntityId ?? this.senderEntityId,
      content: content ?? this.content,
      type: type ?? this.type,
      status: status ?? this.status,
      timestamp: timestamp ?? this.timestamp,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
      localId: localId ?? this.localId,
      serverTimestamp: serverTimestamp ?? this.serverTimestamp,
      isOptimistic: isOptimistic ?? this.isOptimistic,
      replyToMessageId: replyToMessageId ?? this.replyToMessageId,
      transactionId: transactionId ?? this.transactionId,
      metadata: metadata ?? this.metadata,
      editedAt: editedAt ?? this.editedAt,
      isEdited: isEdited ?? this.isEdited,
      isDeleted: isDeleted ?? this.isDeleted,
      deletedAt: deletedAt ?? this.deletedAt,
      deliveredAt: deliveredAt ?? this.deliveredAt,
      readAt: readAt ?? this.readAt,
      reactions: reactions ?? this.reactions,
      priority: priority ?? this.priority,
      encryptionKeyId: encryptionKeyId ?? this.encryptionKeyId,
      sequenceNumber: sequenceNumber ?? this.sequenceNumber,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (interactionId.present) {
      map['interaction_id'] = Variable<String>(interactionId.value);
    }
    if (senderEntityId.present) {
      map['sender_entity_id'] = Variable<String>(senderEntityId.value);
    }
    if (content.present) {
      map['content'] = Variable<String>(content.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (timestamp.present) {
      map['timestamp'] = Variable<int>(timestamp.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(
          $MessagesTableTable.$convertersyncStatus.toSql(syncStatus.value));
    }
    if (localId.present) {
      map['local_id'] = Variable<String>(localId.value);
    }
    if (serverTimestamp.present) {
      map['server_timestamp'] = Variable<int>(serverTimestamp.value);
    }
    if (isOptimistic.present) {
      map['is_optimistic'] = Variable<bool>(isOptimistic.value);
    }
    if (replyToMessageId.present) {
      map['reply_to_message_id'] = Variable<String>(replyToMessageId.value);
    }
    if (transactionId.present) {
      map['transaction_id'] = Variable<String>(transactionId.value);
    }
    if (metadata.present) {
      map['metadata'] = Variable<String>(metadata.value);
    }
    if (editedAt.present) {
      map['edited_at'] = Variable<int>(editedAt.value);
    }
    if (isEdited.present) {
      map['is_edited'] = Variable<bool>(isEdited.value);
    }
    if (isDeleted.present) {
      map['is_deleted'] = Variable<bool>(isDeleted.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (deliveredAt.present) {
      map['delivered_at'] = Variable<int>(deliveredAt.value);
    }
    if (readAt.present) {
      map['read_at'] = Variable<int>(readAt.value);
    }
    if (reactions.present) {
      map['reactions'] = Variable<String>(reactions.value);
    }
    if (priority.present) {
      map['priority'] = Variable<String>(priority.value);
    }
    if (encryptionKeyId.present) {
      map['encryption_key_id'] = Variable<String>(encryptionKeyId.value);
    }
    if (sequenceNumber.present) {
      map['sequence_number'] = Variable<int>(sequenceNumber.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MessagesTableCompanion(')
          ..write('id: $id, ')
          ..write('interactionId: $interactionId, ')
          ..write('senderEntityId: $senderEntityId, ')
          ..write('content: $content, ')
          ..write('type: $type, ')
          ..write('status: $status, ')
          ..write('timestamp: $timestamp, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('localId: $localId, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('isOptimistic: $isOptimistic, ')
          ..write('replyToMessageId: $replyToMessageId, ')
          ..write('transactionId: $transactionId, ')
          ..write('metadata: $metadata, ')
          ..write('editedAt: $editedAt, ')
          ..write('isEdited: $isEdited, ')
          ..write('isDeleted: $isDeleted, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('deliveredAt: $deliveredAt, ')
          ..write('readAt: $readAt, ')
          ..write('reactions: $reactions, ')
          ..write('priority: $priority, ')
          ..write('encryptionKeyId: $encryptionKeyId, ')
          ..write('sequenceNumber: $sequenceNumber, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $InteractionsTableTable extends InteractionsTable
    with TableInfo<$InteractionsTableTable, InteractionEntity> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $InteractionsTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('direct'));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('active'));
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
      'title', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _descriptionMeta =
      const VerificationMeta('description');
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
      'description', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _participantIdsMeta =
      const VerificationMeta('participantIds');
  @override
  late final GeneratedColumn<String> participantIds = GeneratedColumn<String>(
      'participant_ids', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _createdByMeta =
      const VerificationMeta('createdBy');
  @override
  late final GeneratedColumn<String> createdBy = GeneratedColumn<String>(
      'created_by', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _lastMessageAtMeta =
      const VerificationMeta('lastMessageAt');
  @override
  late final GeneratedColumn<int> lastMessageAt = GeneratedColumn<int>(
      'last_message_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _lastMessageIdMeta =
      const VerificationMeta('lastMessageId');
  @override
  late final GeneratedColumn<String> lastMessageId = GeneratedColumn<String>(
      'last_message_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _lastMessagePreviewMeta =
      const VerificationMeta('lastMessagePreview');
  @override
  late final GeneratedColumn<String> lastMessagePreview =
      GeneratedColumn<String>('last_message_preview', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _lastMessageSenderIdMeta =
      const VerificationMeta('lastMessageSenderId');
  @override
  late final GeneratedColumn<String> lastMessageSenderId =
      GeneratedColumn<String>('last_message_sender_id', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  late final GeneratedColumnWithTypeConverter<SyncStatus, int> syncStatus =
      GeneratedColumn<int>('sync_status', aliasedName, false,
              type: DriftSqlType.int,
              requiredDuringInsert: false,
              defaultValue: const Constant(1))
          .withConverter<SyncStatus>(
              $InteractionsTableTable.$convertersyncStatus);
  static const VerificationMeta _localIdMeta =
      const VerificationMeta('localId');
  @override
  late final GeneratedColumn<String> localId = GeneratedColumn<String>(
      'local_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _serverTimestampMeta =
      const VerificationMeta('serverTimestamp');
  @override
  late final GeneratedColumn<int> serverTimestamp = GeneratedColumn<int>(
      'server_timestamp', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _isOptimisticMeta =
      const VerificationMeta('isOptimistic');
  @override
  late final GeneratedColumn<bool> isOptimistic = GeneratedColumn<bool>(
      'is_optimistic', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_optimistic" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _unreadCountMeta =
      const VerificationMeta('unreadCount');
  @override
  late final GeneratedColumn<int> unreadCount = GeneratedColumn<int>(
      'unread_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _isPinnedMeta =
      const VerificationMeta('isPinned');
  @override
  late final GeneratedColumn<bool> isPinned = GeneratedColumn<bool>(
      'is_pinned', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_pinned" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _isMutedMeta =
      const VerificationMeta('isMuted');
  @override
  late final GeneratedColumn<bool> isMuted = GeneratedColumn<bool>(
      'is_muted', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_muted" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _isArchivedMeta =
      const VerificationMeta('isArchived');
  @override
  late final GeneratedColumn<bool> isArchived = GeneratedColumn<bool>(
      'is_archived', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_archived" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _metadataMeta =
      const VerificationMeta('metadata');
  @override
  late final GeneratedColumn<String> metadata = GeneratedColumn<String>(
      'metadata', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _avatarUrlMeta =
      const VerificationMeta('avatarUrl');
  @override
  late final GeneratedColumn<String> avatarUrl = GeneratedColumn<String>(
      'avatar_url', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _colorThemeMeta =
      const VerificationMeta('colorTheme');
  @override
  late final GeneratedColumn<String> colorTheme = GeneratedColumn<String>(
      'color_theme', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _notificationSettingsMeta =
      const VerificationMeta('notificationSettings');
  @override
  late final GeneratedColumn<String> notificationSettings =
      GeneratedColumn<String>('notification_settings', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _tagsMeta = const VerificationMeta('tags');
  @override
  late final GeneratedColumn<String> tags = GeneratedColumn<String>(
      'tags', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _lastAccessedAtMeta =
      const VerificationMeta('lastAccessedAt');
  @override
  late final GeneratedColumn<int> lastAccessedAt = GeneratedColumn<int>(
      'last_accessed_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _encryptionSettingsMeta =
      const VerificationMeta('encryptionSettings');
  @override
  late final GeneratedColumn<String> encryptionSettings =
      GeneratedColumn<String>('encryption_settings', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _allowNewMembersMeta =
      const VerificationMeta('allowNewMembers');
  @override
  late final GeneratedColumn<bool> allowNewMembers = GeneratedColumn<bool>(
      'allow_new_members', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("allow_new_members" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _maxParticipantsMeta =
      const VerificationMeta('maxParticipants');
  @override
  late final GeneratedColumn<int> maxParticipants = GeneratedColumn<int>(
      'max_participants', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        type,
        status,
        title,
        description,
        participantIds,
        createdBy,
        createdAt,
        updatedAt,
        lastMessageAt,
        lastMessageId,
        lastMessagePreview,
        lastMessageSenderId,
        syncStatus,
        localId,
        serverTimestamp,
        isOptimistic,
        unreadCount,
        isPinned,
        isMuted,
        isArchived,
        metadata,
        avatarUrl,
        colorTheme,
        notificationSettings,
        tags,
        lastAccessedAt,
        encryptionSettings,
        allowNewMembers,
        maxParticipants
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'interactions_table';
  @override
  VerificationContext validateIntegrity(Insertable<InteractionEntity> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('title')) {
      context.handle(
          _titleMeta, title.isAcceptableOrUnknown(data['title']!, _titleMeta));
    }
    if (data.containsKey('description')) {
      context.handle(
          _descriptionMeta,
          description.isAcceptableOrUnknown(
              data['description']!, _descriptionMeta));
    }
    if (data.containsKey('participant_ids')) {
      context.handle(
          _participantIdsMeta,
          participantIds.isAcceptableOrUnknown(
              data['participant_ids']!, _participantIdsMeta));
    } else if (isInserting) {
      context.missing(_participantIdsMeta);
    }
    if (data.containsKey('created_by')) {
      context.handle(_createdByMeta,
          createdBy.isAcceptableOrUnknown(data['created_by']!, _createdByMeta));
    } else if (isInserting) {
      context.missing(_createdByMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('last_message_at')) {
      context.handle(
          _lastMessageAtMeta,
          lastMessageAt.isAcceptableOrUnknown(
              data['last_message_at']!, _lastMessageAtMeta));
    }
    if (data.containsKey('last_message_id')) {
      context.handle(
          _lastMessageIdMeta,
          lastMessageId.isAcceptableOrUnknown(
              data['last_message_id']!, _lastMessageIdMeta));
    }
    if (data.containsKey('last_message_preview')) {
      context.handle(
          _lastMessagePreviewMeta,
          lastMessagePreview.isAcceptableOrUnknown(
              data['last_message_preview']!, _lastMessagePreviewMeta));
    }
    if (data.containsKey('last_message_sender_id')) {
      context.handle(
          _lastMessageSenderIdMeta,
          lastMessageSenderId.isAcceptableOrUnknown(
              data['last_message_sender_id']!, _lastMessageSenderIdMeta));
    }
    if (data.containsKey('local_id')) {
      context.handle(_localIdMeta,
          localId.isAcceptableOrUnknown(data['local_id']!, _localIdMeta));
    }
    if (data.containsKey('server_timestamp')) {
      context.handle(
          _serverTimestampMeta,
          serverTimestamp.isAcceptableOrUnknown(
              data['server_timestamp']!, _serverTimestampMeta));
    }
    if (data.containsKey('is_optimistic')) {
      context.handle(
          _isOptimisticMeta,
          isOptimistic.isAcceptableOrUnknown(
              data['is_optimistic']!, _isOptimisticMeta));
    }
    if (data.containsKey('unread_count')) {
      context.handle(
          _unreadCountMeta,
          unreadCount.isAcceptableOrUnknown(
              data['unread_count']!, _unreadCountMeta));
    }
    if (data.containsKey('is_pinned')) {
      context.handle(_isPinnedMeta,
          isPinned.isAcceptableOrUnknown(data['is_pinned']!, _isPinnedMeta));
    }
    if (data.containsKey('is_muted')) {
      context.handle(_isMutedMeta,
          isMuted.isAcceptableOrUnknown(data['is_muted']!, _isMutedMeta));
    }
    if (data.containsKey('is_archived')) {
      context.handle(
          _isArchivedMeta,
          isArchived.isAcceptableOrUnknown(
              data['is_archived']!, _isArchivedMeta));
    }
    if (data.containsKey('metadata')) {
      context.handle(_metadataMeta,
          metadata.isAcceptableOrUnknown(data['metadata']!, _metadataMeta));
    }
    if (data.containsKey('avatar_url')) {
      context.handle(_avatarUrlMeta,
          avatarUrl.isAcceptableOrUnknown(data['avatar_url']!, _avatarUrlMeta));
    }
    if (data.containsKey('color_theme')) {
      context.handle(
          _colorThemeMeta,
          colorTheme.isAcceptableOrUnknown(
              data['color_theme']!, _colorThemeMeta));
    }
    if (data.containsKey('notification_settings')) {
      context.handle(
          _notificationSettingsMeta,
          notificationSettings.isAcceptableOrUnknown(
              data['notification_settings']!, _notificationSettingsMeta));
    }
    if (data.containsKey('tags')) {
      context.handle(
          _tagsMeta, tags.isAcceptableOrUnknown(data['tags']!, _tagsMeta));
    }
    if (data.containsKey('last_accessed_at')) {
      context.handle(
          _lastAccessedAtMeta,
          lastAccessedAt.isAcceptableOrUnknown(
              data['last_accessed_at']!, _lastAccessedAtMeta));
    }
    if (data.containsKey('encryption_settings')) {
      context.handle(
          _encryptionSettingsMeta,
          encryptionSettings.isAcceptableOrUnknown(
              data['encryption_settings']!, _encryptionSettingsMeta));
    }
    if (data.containsKey('allow_new_members')) {
      context.handle(
          _allowNewMembersMeta,
          allowNewMembers.isAcceptableOrUnknown(
              data['allow_new_members']!, _allowNewMembersMeta));
    }
    if (data.containsKey('max_participants')) {
      context.handle(
          _maxParticipantsMeta,
          maxParticipants.isAcceptableOrUnknown(
              data['max_participants']!, _maxParticipantsMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  InteractionEntity map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return InteractionEntity(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      title: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}title']),
      description: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}description']),
      participantIds: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}participant_ids'])!,
      createdBy: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}created_by'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
      lastMessageAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}last_message_at']),
      lastMessageId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_message_id']),
      lastMessagePreview: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}last_message_preview']),
      lastMessageSenderId: attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}last_message_sender_id']),
      syncStatus: $InteractionsTableTable.$convertersyncStatus.fromSql(
          attachedDatabase.typeMapping
              .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!),
      localId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_id']),
      serverTimestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}server_timestamp']),
      isOptimistic: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_optimistic'])!,
      unreadCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}unread_count'])!,
      isPinned: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_pinned'])!,
      isMuted: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_muted'])!,
      isArchived: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_archived'])!,
      metadata: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}metadata']),
      avatarUrl: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}avatar_url']),
      colorTheme: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}color_theme']),
      notificationSettings: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}notification_settings']),
      tags: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tags']),
      lastAccessedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}last_accessed_at']),
      encryptionSettings: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}encryption_settings']),
      allowNewMembers: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}allow_new_members'])!,
      maxParticipants: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}max_participants']),
    );
  }

  @override
  $InteractionsTableTable createAlias(String alias) {
    return $InteractionsTableTable(attachedDatabase, alias);
  }

  static JsonTypeConverter2<SyncStatus, int, int> $convertersyncStatus =
      const EnumIndexConverter<SyncStatus>(SyncStatus.values);
}

class InteractionEntity extends DataClass
    implements Insertable<InteractionEntity> {
  /// Primary key - server-generated ID once synced
  final String id;

  /// Type of interaction (direct, group, business, etc.)
  final String type;

  /// Interaction status (active, archived, blocked, etc.)
  final String status;

  /// Interaction title/name (for group chats)
  final String? title;

  /// Interaction description
  final String? description;

  /// Comma-separated list of participant entity IDs
  final String participantIds;

  /// ID of the interaction creator
  final String createdBy;

  /// When this interaction was created (milliseconds since epoch)
  final int createdAt;

  /// When this interaction was last updated
  final int updatedAt;

  /// Timestamp of the last message in this interaction
  final int? lastMessageAt;

  /// ID of the last message in this interaction
  final String? lastMessageId;

  /// Content preview of the last message
  final String? lastMessagePreview;

  /// Entity ID of the last message sender
  final String? lastMessageSenderId;

  /// Sync status for offline-first architecture
  final SyncStatus syncStatus;

  /// Local ID for offline-created records (UUID)
  final String? localId;

  /// Server-side timestamp for conflict resolution
  final int? serverTimestamp;

  /// Whether this is an optimistic interaction (not yet confirmed by server)
  final bool isOptimistic;

  /// Unread message count for current user
  final int unreadCount;

  /// Whether this interaction is pinned
  final bool isPinned;

  /// Whether this interaction is muted
  final bool isMuted;

  /// Whether this interaction is archived
  final bool isArchived;

  /// Interaction metadata as JSON string (settings, permissions, etc.)
  final String? metadata;

  /// Interaction avatar/image URL
  final String? avatarUrl;

  /// Interaction color theme
  final String? colorTheme;

  /// Custom notification settings as JSON
  final String? notificationSettings;

  /// Tags associated with this interaction
  final String? tags;

  /// Last time this interaction was accessed by current user
  final int? lastAccessedAt;

  /// Encryption settings for this interaction
  final String? encryptionSettings;

  /// Whether this interaction allows new members
  final bool allowNewMembers;

  /// Maximum number of participants allowed
  final int? maxParticipants;
  const InteractionEntity(
      {required this.id,
      required this.type,
      required this.status,
      this.title,
      this.description,
      required this.participantIds,
      required this.createdBy,
      required this.createdAt,
      required this.updatedAt,
      this.lastMessageAt,
      this.lastMessageId,
      this.lastMessagePreview,
      this.lastMessageSenderId,
      required this.syncStatus,
      this.localId,
      this.serverTimestamp,
      required this.isOptimistic,
      required this.unreadCount,
      required this.isPinned,
      required this.isMuted,
      required this.isArchived,
      this.metadata,
      this.avatarUrl,
      this.colorTheme,
      this.notificationSettings,
      this.tags,
      this.lastAccessedAt,
      this.encryptionSettings,
      required this.allowNewMembers,
      this.maxParticipants});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['type'] = Variable<String>(type);
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || title != null) {
      map['title'] = Variable<String>(title);
    }
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    map['participant_ids'] = Variable<String>(participantIds);
    map['created_by'] = Variable<String>(createdBy);
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || lastMessageAt != null) {
      map['last_message_at'] = Variable<int>(lastMessageAt);
    }
    if (!nullToAbsent || lastMessageId != null) {
      map['last_message_id'] = Variable<String>(lastMessageId);
    }
    if (!nullToAbsent || lastMessagePreview != null) {
      map['last_message_preview'] = Variable<String>(lastMessagePreview);
    }
    if (!nullToAbsent || lastMessageSenderId != null) {
      map['last_message_sender_id'] = Variable<String>(lastMessageSenderId);
    }
    {
      map['sync_status'] = Variable<int>(
          $InteractionsTableTable.$convertersyncStatus.toSql(syncStatus));
    }
    if (!nullToAbsent || localId != null) {
      map['local_id'] = Variable<String>(localId);
    }
    if (!nullToAbsent || serverTimestamp != null) {
      map['server_timestamp'] = Variable<int>(serverTimestamp);
    }
    map['is_optimistic'] = Variable<bool>(isOptimistic);
    map['unread_count'] = Variable<int>(unreadCount);
    map['is_pinned'] = Variable<bool>(isPinned);
    map['is_muted'] = Variable<bool>(isMuted);
    map['is_archived'] = Variable<bool>(isArchived);
    if (!nullToAbsent || metadata != null) {
      map['metadata'] = Variable<String>(metadata);
    }
    if (!nullToAbsent || avatarUrl != null) {
      map['avatar_url'] = Variable<String>(avatarUrl);
    }
    if (!nullToAbsent || colorTheme != null) {
      map['color_theme'] = Variable<String>(colorTheme);
    }
    if (!nullToAbsent || notificationSettings != null) {
      map['notification_settings'] = Variable<String>(notificationSettings);
    }
    if (!nullToAbsent || tags != null) {
      map['tags'] = Variable<String>(tags);
    }
    if (!nullToAbsent || lastAccessedAt != null) {
      map['last_accessed_at'] = Variable<int>(lastAccessedAt);
    }
    if (!nullToAbsent || encryptionSettings != null) {
      map['encryption_settings'] = Variable<String>(encryptionSettings);
    }
    map['allow_new_members'] = Variable<bool>(allowNewMembers);
    if (!nullToAbsent || maxParticipants != null) {
      map['max_participants'] = Variable<int>(maxParticipants);
    }
    return map;
  }

  InteractionsTableCompanion toCompanion(bool nullToAbsent) {
    return InteractionsTableCompanion(
      id: Value(id),
      type: Value(type),
      status: Value(status),
      title:
          title == null && nullToAbsent ? const Value.absent() : Value(title),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      participantIds: Value(participantIds),
      createdBy: Value(createdBy),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      lastMessageAt: lastMessageAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastMessageAt),
      lastMessageId: lastMessageId == null && nullToAbsent
          ? const Value.absent()
          : Value(lastMessageId),
      lastMessagePreview: lastMessagePreview == null && nullToAbsent
          ? const Value.absent()
          : Value(lastMessagePreview),
      lastMessageSenderId: lastMessageSenderId == null && nullToAbsent
          ? const Value.absent()
          : Value(lastMessageSenderId),
      syncStatus: Value(syncStatus),
      localId: localId == null && nullToAbsent
          ? const Value.absent()
          : Value(localId),
      serverTimestamp: serverTimestamp == null && nullToAbsent
          ? const Value.absent()
          : Value(serverTimestamp),
      isOptimistic: Value(isOptimistic),
      unreadCount: Value(unreadCount),
      isPinned: Value(isPinned),
      isMuted: Value(isMuted),
      isArchived: Value(isArchived),
      metadata: metadata == null && nullToAbsent
          ? const Value.absent()
          : Value(metadata),
      avatarUrl: avatarUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(avatarUrl),
      colorTheme: colorTheme == null && nullToAbsent
          ? const Value.absent()
          : Value(colorTheme),
      notificationSettings: notificationSettings == null && nullToAbsent
          ? const Value.absent()
          : Value(notificationSettings),
      tags: tags == null && nullToAbsent ? const Value.absent() : Value(tags),
      lastAccessedAt: lastAccessedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastAccessedAt),
      encryptionSettings: encryptionSettings == null && nullToAbsent
          ? const Value.absent()
          : Value(encryptionSettings),
      allowNewMembers: Value(allowNewMembers),
      maxParticipants: maxParticipants == null && nullToAbsent
          ? const Value.absent()
          : Value(maxParticipants),
    );
  }

  factory InteractionEntity.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return InteractionEntity(
      id: serializer.fromJson<String>(json['id']),
      type: serializer.fromJson<String>(json['type']),
      status: serializer.fromJson<String>(json['status']),
      title: serializer.fromJson<String?>(json['title']),
      description: serializer.fromJson<String?>(json['description']),
      participantIds: serializer.fromJson<String>(json['participantIds']),
      createdBy: serializer.fromJson<String>(json['createdBy']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      lastMessageAt: serializer.fromJson<int?>(json['lastMessageAt']),
      lastMessageId: serializer.fromJson<String?>(json['lastMessageId']),
      lastMessagePreview:
          serializer.fromJson<String?>(json['lastMessagePreview']),
      lastMessageSenderId:
          serializer.fromJson<String?>(json['lastMessageSenderId']),
      syncStatus: $InteractionsTableTable.$convertersyncStatus
          .fromJson(serializer.fromJson<int>(json['syncStatus'])),
      localId: serializer.fromJson<String?>(json['localId']),
      serverTimestamp: serializer.fromJson<int?>(json['serverTimestamp']),
      isOptimistic: serializer.fromJson<bool>(json['isOptimistic']),
      unreadCount: serializer.fromJson<int>(json['unreadCount']),
      isPinned: serializer.fromJson<bool>(json['isPinned']),
      isMuted: serializer.fromJson<bool>(json['isMuted']),
      isArchived: serializer.fromJson<bool>(json['isArchived']),
      metadata: serializer.fromJson<String?>(json['metadata']),
      avatarUrl: serializer.fromJson<String?>(json['avatarUrl']),
      colorTheme: serializer.fromJson<String?>(json['colorTheme']),
      notificationSettings:
          serializer.fromJson<String?>(json['notificationSettings']),
      tags: serializer.fromJson<String?>(json['tags']),
      lastAccessedAt: serializer.fromJson<int?>(json['lastAccessedAt']),
      encryptionSettings:
          serializer.fromJson<String?>(json['encryptionSettings']),
      allowNewMembers: serializer.fromJson<bool>(json['allowNewMembers']),
      maxParticipants: serializer.fromJson<int?>(json['maxParticipants']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'type': serializer.toJson<String>(type),
      'status': serializer.toJson<String>(status),
      'title': serializer.toJson<String?>(title),
      'description': serializer.toJson<String?>(description),
      'participantIds': serializer.toJson<String>(participantIds),
      'createdBy': serializer.toJson<String>(createdBy),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'lastMessageAt': serializer.toJson<int?>(lastMessageAt),
      'lastMessageId': serializer.toJson<String?>(lastMessageId),
      'lastMessagePreview': serializer.toJson<String?>(lastMessagePreview),
      'lastMessageSenderId': serializer.toJson<String?>(lastMessageSenderId),
      'syncStatus': serializer.toJson<int>(
          $InteractionsTableTable.$convertersyncStatus.toJson(syncStatus)),
      'localId': serializer.toJson<String?>(localId),
      'serverTimestamp': serializer.toJson<int?>(serverTimestamp),
      'isOptimistic': serializer.toJson<bool>(isOptimistic),
      'unreadCount': serializer.toJson<int>(unreadCount),
      'isPinned': serializer.toJson<bool>(isPinned),
      'isMuted': serializer.toJson<bool>(isMuted),
      'isArchived': serializer.toJson<bool>(isArchived),
      'metadata': serializer.toJson<String?>(metadata),
      'avatarUrl': serializer.toJson<String?>(avatarUrl),
      'colorTheme': serializer.toJson<String?>(colorTheme),
      'notificationSettings': serializer.toJson<String?>(notificationSettings),
      'tags': serializer.toJson<String?>(tags),
      'lastAccessedAt': serializer.toJson<int?>(lastAccessedAt),
      'encryptionSettings': serializer.toJson<String?>(encryptionSettings),
      'allowNewMembers': serializer.toJson<bool>(allowNewMembers),
      'maxParticipants': serializer.toJson<int?>(maxParticipants),
    };
  }

  InteractionEntity copyWith(
          {String? id,
          String? type,
          String? status,
          Value<String?> title = const Value.absent(),
          Value<String?> description = const Value.absent(),
          String? participantIds,
          String? createdBy,
          int? createdAt,
          int? updatedAt,
          Value<int?> lastMessageAt = const Value.absent(),
          Value<String?> lastMessageId = const Value.absent(),
          Value<String?> lastMessagePreview = const Value.absent(),
          Value<String?> lastMessageSenderId = const Value.absent(),
          SyncStatus? syncStatus,
          Value<String?> localId = const Value.absent(),
          Value<int?> serverTimestamp = const Value.absent(),
          bool? isOptimistic,
          int? unreadCount,
          bool? isPinned,
          bool? isMuted,
          bool? isArchived,
          Value<String?> metadata = const Value.absent(),
          Value<String?> avatarUrl = const Value.absent(),
          Value<String?> colorTheme = const Value.absent(),
          Value<String?> notificationSettings = const Value.absent(),
          Value<String?> tags = const Value.absent(),
          Value<int?> lastAccessedAt = const Value.absent(),
          Value<String?> encryptionSettings = const Value.absent(),
          bool? allowNewMembers,
          Value<int?> maxParticipants = const Value.absent()}) =>
      InteractionEntity(
        id: id ?? this.id,
        type: type ?? this.type,
        status: status ?? this.status,
        title: title.present ? title.value : this.title,
        description: description.present ? description.value : this.description,
        participantIds: participantIds ?? this.participantIds,
        createdBy: createdBy ?? this.createdBy,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        lastMessageAt:
            lastMessageAt.present ? lastMessageAt.value : this.lastMessageAt,
        lastMessageId:
            lastMessageId.present ? lastMessageId.value : this.lastMessageId,
        lastMessagePreview: lastMessagePreview.present
            ? lastMessagePreview.value
            : this.lastMessagePreview,
        lastMessageSenderId: lastMessageSenderId.present
            ? lastMessageSenderId.value
            : this.lastMessageSenderId,
        syncStatus: syncStatus ?? this.syncStatus,
        localId: localId.present ? localId.value : this.localId,
        serverTimestamp: serverTimestamp.present
            ? serverTimestamp.value
            : this.serverTimestamp,
        isOptimistic: isOptimistic ?? this.isOptimistic,
        unreadCount: unreadCount ?? this.unreadCount,
        isPinned: isPinned ?? this.isPinned,
        isMuted: isMuted ?? this.isMuted,
        isArchived: isArchived ?? this.isArchived,
        metadata: metadata.present ? metadata.value : this.metadata,
        avatarUrl: avatarUrl.present ? avatarUrl.value : this.avatarUrl,
        colorTheme: colorTheme.present ? colorTheme.value : this.colorTheme,
        notificationSettings: notificationSettings.present
            ? notificationSettings.value
            : this.notificationSettings,
        tags: tags.present ? tags.value : this.tags,
        lastAccessedAt:
            lastAccessedAt.present ? lastAccessedAt.value : this.lastAccessedAt,
        encryptionSettings: encryptionSettings.present
            ? encryptionSettings.value
            : this.encryptionSettings,
        allowNewMembers: allowNewMembers ?? this.allowNewMembers,
        maxParticipants: maxParticipants.present
            ? maxParticipants.value
            : this.maxParticipants,
      );
  InteractionEntity copyWithCompanion(InteractionsTableCompanion data) {
    return InteractionEntity(
      id: data.id.present ? data.id.value : this.id,
      type: data.type.present ? data.type.value : this.type,
      status: data.status.present ? data.status.value : this.status,
      title: data.title.present ? data.title.value : this.title,
      description:
          data.description.present ? data.description.value : this.description,
      participantIds: data.participantIds.present
          ? data.participantIds.value
          : this.participantIds,
      createdBy: data.createdBy.present ? data.createdBy.value : this.createdBy,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastMessageAt: data.lastMessageAt.present
          ? data.lastMessageAt.value
          : this.lastMessageAt,
      lastMessageId: data.lastMessageId.present
          ? data.lastMessageId.value
          : this.lastMessageId,
      lastMessagePreview: data.lastMessagePreview.present
          ? data.lastMessagePreview.value
          : this.lastMessagePreview,
      lastMessageSenderId: data.lastMessageSenderId.present
          ? data.lastMessageSenderId.value
          : this.lastMessageSenderId,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      localId: data.localId.present ? data.localId.value : this.localId,
      serverTimestamp: data.serverTimestamp.present
          ? data.serverTimestamp.value
          : this.serverTimestamp,
      isOptimistic: data.isOptimistic.present
          ? data.isOptimistic.value
          : this.isOptimistic,
      unreadCount:
          data.unreadCount.present ? data.unreadCount.value : this.unreadCount,
      isPinned: data.isPinned.present ? data.isPinned.value : this.isPinned,
      isMuted: data.isMuted.present ? data.isMuted.value : this.isMuted,
      isArchived:
          data.isArchived.present ? data.isArchived.value : this.isArchived,
      metadata: data.metadata.present ? data.metadata.value : this.metadata,
      avatarUrl: data.avatarUrl.present ? data.avatarUrl.value : this.avatarUrl,
      colorTheme:
          data.colorTheme.present ? data.colorTheme.value : this.colorTheme,
      notificationSettings: data.notificationSettings.present
          ? data.notificationSettings.value
          : this.notificationSettings,
      tags: data.tags.present ? data.tags.value : this.tags,
      lastAccessedAt: data.lastAccessedAt.present
          ? data.lastAccessedAt.value
          : this.lastAccessedAt,
      encryptionSettings: data.encryptionSettings.present
          ? data.encryptionSettings.value
          : this.encryptionSettings,
      allowNewMembers: data.allowNewMembers.present
          ? data.allowNewMembers.value
          : this.allowNewMembers,
      maxParticipants: data.maxParticipants.present
          ? data.maxParticipants.value
          : this.maxParticipants,
    );
  }

  @override
  String toString() {
    return (StringBuffer('InteractionEntity(')
          ..write('id: $id, ')
          ..write('type: $type, ')
          ..write('status: $status, ')
          ..write('title: $title, ')
          ..write('description: $description, ')
          ..write('participantIds: $participantIds, ')
          ..write('createdBy: $createdBy, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastMessageAt: $lastMessageAt, ')
          ..write('lastMessageId: $lastMessageId, ')
          ..write('lastMessagePreview: $lastMessagePreview, ')
          ..write('lastMessageSenderId: $lastMessageSenderId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('localId: $localId, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('isOptimistic: $isOptimistic, ')
          ..write('unreadCount: $unreadCount, ')
          ..write('isPinned: $isPinned, ')
          ..write('isMuted: $isMuted, ')
          ..write('isArchived: $isArchived, ')
          ..write('metadata: $metadata, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('colorTheme: $colorTheme, ')
          ..write('notificationSettings: $notificationSettings, ')
          ..write('tags: $tags, ')
          ..write('lastAccessedAt: $lastAccessedAt, ')
          ..write('encryptionSettings: $encryptionSettings, ')
          ..write('allowNewMembers: $allowNewMembers, ')
          ..write('maxParticipants: $maxParticipants')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        type,
        status,
        title,
        description,
        participantIds,
        createdBy,
        createdAt,
        updatedAt,
        lastMessageAt,
        lastMessageId,
        lastMessagePreview,
        lastMessageSenderId,
        syncStatus,
        localId,
        serverTimestamp,
        isOptimistic,
        unreadCount,
        isPinned,
        isMuted,
        isArchived,
        metadata,
        avatarUrl,
        colorTheme,
        notificationSettings,
        tags,
        lastAccessedAt,
        encryptionSettings,
        allowNewMembers,
        maxParticipants
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is InteractionEntity &&
          other.id == this.id &&
          other.type == this.type &&
          other.status == this.status &&
          other.title == this.title &&
          other.description == this.description &&
          other.participantIds == this.participantIds &&
          other.createdBy == this.createdBy &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastMessageAt == this.lastMessageAt &&
          other.lastMessageId == this.lastMessageId &&
          other.lastMessagePreview == this.lastMessagePreview &&
          other.lastMessageSenderId == this.lastMessageSenderId &&
          other.syncStatus == this.syncStatus &&
          other.localId == this.localId &&
          other.serverTimestamp == this.serverTimestamp &&
          other.isOptimistic == this.isOptimistic &&
          other.unreadCount == this.unreadCount &&
          other.isPinned == this.isPinned &&
          other.isMuted == this.isMuted &&
          other.isArchived == this.isArchived &&
          other.metadata == this.metadata &&
          other.avatarUrl == this.avatarUrl &&
          other.colorTheme == this.colorTheme &&
          other.notificationSettings == this.notificationSettings &&
          other.tags == this.tags &&
          other.lastAccessedAt == this.lastAccessedAt &&
          other.encryptionSettings == this.encryptionSettings &&
          other.allowNewMembers == this.allowNewMembers &&
          other.maxParticipants == this.maxParticipants);
}

class InteractionsTableCompanion extends UpdateCompanion<InteractionEntity> {
  final Value<String> id;
  final Value<String> type;
  final Value<String> status;
  final Value<String?> title;
  final Value<String?> description;
  final Value<String> participantIds;
  final Value<String> createdBy;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> lastMessageAt;
  final Value<String?> lastMessageId;
  final Value<String?> lastMessagePreview;
  final Value<String?> lastMessageSenderId;
  final Value<SyncStatus> syncStatus;
  final Value<String?> localId;
  final Value<int?> serverTimestamp;
  final Value<bool> isOptimistic;
  final Value<int> unreadCount;
  final Value<bool> isPinned;
  final Value<bool> isMuted;
  final Value<bool> isArchived;
  final Value<String?> metadata;
  final Value<String?> avatarUrl;
  final Value<String?> colorTheme;
  final Value<String?> notificationSettings;
  final Value<String?> tags;
  final Value<int?> lastAccessedAt;
  final Value<String?> encryptionSettings;
  final Value<bool> allowNewMembers;
  final Value<int?> maxParticipants;
  final Value<int> rowid;
  const InteractionsTableCompanion({
    this.id = const Value.absent(),
    this.type = const Value.absent(),
    this.status = const Value.absent(),
    this.title = const Value.absent(),
    this.description = const Value.absent(),
    this.participantIds = const Value.absent(),
    this.createdBy = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastMessageAt = const Value.absent(),
    this.lastMessageId = const Value.absent(),
    this.lastMessagePreview = const Value.absent(),
    this.lastMessageSenderId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.localId = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.isOptimistic = const Value.absent(),
    this.unreadCount = const Value.absent(),
    this.isPinned = const Value.absent(),
    this.isMuted = const Value.absent(),
    this.isArchived = const Value.absent(),
    this.metadata = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.colorTheme = const Value.absent(),
    this.notificationSettings = const Value.absent(),
    this.tags = const Value.absent(),
    this.lastAccessedAt = const Value.absent(),
    this.encryptionSettings = const Value.absent(),
    this.allowNewMembers = const Value.absent(),
    this.maxParticipants = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  InteractionsTableCompanion.insert({
    required String id,
    this.type = const Value.absent(),
    this.status = const Value.absent(),
    this.title = const Value.absent(),
    this.description = const Value.absent(),
    required String participantIds,
    required String createdBy,
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastMessageAt = const Value.absent(),
    this.lastMessageId = const Value.absent(),
    this.lastMessagePreview = const Value.absent(),
    this.lastMessageSenderId = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.localId = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.isOptimistic = const Value.absent(),
    this.unreadCount = const Value.absent(),
    this.isPinned = const Value.absent(),
    this.isMuted = const Value.absent(),
    this.isArchived = const Value.absent(),
    this.metadata = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.colorTheme = const Value.absent(),
    this.notificationSettings = const Value.absent(),
    this.tags = const Value.absent(),
    this.lastAccessedAt = const Value.absent(),
    this.encryptionSettings = const Value.absent(),
    this.allowNewMembers = const Value.absent(),
    this.maxParticipants = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        participantIds = Value(participantIds),
        createdBy = Value(createdBy);
  static Insertable<InteractionEntity> custom({
    Expression<String>? id,
    Expression<String>? type,
    Expression<String>? status,
    Expression<String>? title,
    Expression<String>? description,
    Expression<String>? participantIds,
    Expression<String>? createdBy,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? lastMessageAt,
    Expression<String>? lastMessageId,
    Expression<String>? lastMessagePreview,
    Expression<String>? lastMessageSenderId,
    Expression<int>? syncStatus,
    Expression<String>? localId,
    Expression<int>? serverTimestamp,
    Expression<bool>? isOptimistic,
    Expression<int>? unreadCount,
    Expression<bool>? isPinned,
    Expression<bool>? isMuted,
    Expression<bool>? isArchived,
    Expression<String>? metadata,
    Expression<String>? avatarUrl,
    Expression<String>? colorTheme,
    Expression<String>? notificationSettings,
    Expression<String>? tags,
    Expression<int>? lastAccessedAt,
    Expression<String>? encryptionSettings,
    Expression<bool>? allowNewMembers,
    Expression<int>? maxParticipants,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (type != null) 'type': type,
      if (status != null) 'status': status,
      if (title != null) 'title': title,
      if (description != null) 'description': description,
      if (participantIds != null) 'participant_ids': participantIds,
      if (createdBy != null) 'created_by': createdBy,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastMessageAt != null) 'last_message_at': lastMessageAt,
      if (lastMessageId != null) 'last_message_id': lastMessageId,
      if (lastMessagePreview != null)
        'last_message_preview': lastMessagePreview,
      if (lastMessageSenderId != null)
        'last_message_sender_id': lastMessageSenderId,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (localId != null) 'local_id': localId,
      if (serverTimestamp != null) 'server_timestamp': serverTimestamp,
      if (isOptimistic != null) 'is_optimistic': isOptimistic,
      if (unreadCount != null) 'unread_count': unreadCount,
      if (isPinned != null) 'is_pinned': isPinned,
      if (isMuted != null) 'is_muted': isMuted,
      if (isArchived != null) 'is_archived': isArchived,
      if (metadata != null) 'metadata': metadata,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (colorTheme != null) 'color_theme': colorTheme,
      if (notificationSettings != null)
        'notification_settings': notificationSettings,
      if (tags != null) 'tags': tags,
      if (lastAccessedAt != null) 'last_accessed_at': lastAccessedAt,
      if (encryptionSettings != null) 'encryption_settings': encryptionSettings,
      if (allowNewMembers != null) 'allow_new_members': allowNewMembers,
      if (maxParticipants != null) 'max_participants': maxParticipants,
      if (rowid != null) 'rowid': rowid,
    });
  }

  InteractionsTableCompanion copyWith(
      {Value<String>? id,
      Value<String>? type,
      Value<String>? status,
      Value<String?>? title,
      Value<String?>? description,
      Value<String>? participantIds,
      Value<String>? createdBy,
      Value<int>? createdAt,
      Value<int>? updatedAt,
      Value<int?>? lastMessageAt,
      Value<String?>? lastMessageId,
      Value<String?>? lastMessagePreview,
      Value<String?>? lastMessageSenderId,
      Value<SyncStatus>? syncStatus,
      Value<String?>? localId,
      Value<int?>? serverTimestamp,
      Value<bool>? isOptimistic,
      Value<int>? unreadCount,
      Value<bool>? isPinned,
      Value<bool>? isMuted,
      Value<bool>? isArchived,
      Value<String?>? metadata,
      Value<String?>? avatarUrl,
      Value<String?>? colorTheme,
      Value<String?>? notificationSettings,
      Value<String?>? tags,
      Value<int?>? lastAccessedAt,
      Value<String?>? encryptionSettings,
      Value<bool>? allowNewMembers,
      Value<int?>? maxParticipants,
      Value<int>? rowid}) {
    return InteractionsTableCompanion(
      id: id ?? this.id,
      type: type ?? this.type,
      status: status ?? this.status,
      title: title ?? this.title,
      description: description ?? this.description,
      participantIds: participantIds ?? this.participantIds,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      lastMessageId: lastMessageId ?? this.lastMessageId,
      lastMessagePreview: lastMessagePreview ?? this.lastMessagePreview,
      lastMessageSenderId: lastMessageSenderId ?? this.lastMessageSenderId,
      syncStatus: syncStatus ?? this.syncStatus,
      localId: localId ?? this.localId,
      serverTimestamp: serverTimestamp ?? this.serverTimestamp,
      isOptimistic: isOptimistic ?? this.isOptimistic,
      unreadCount: unreadCount ?? this.unreadCount,
      isPinned: isPinned ?? this.isPinned,
      isMuted: isMuted ?? this.isMuted,
      isArchived: isArchived ?? this.isArchived,
      metadata: metadata ?? this.metadata,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      colorTheme: colorTheme ?? this.colorTheme,
      notificationSettings: notificationSettings ?? this.notificationSettings,
      tags: tags ?? this.tags,
      lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
      encryptionSettings: encryptionSettings ?? this.encryptionSettings,
      allowNewMembers: allowNewMembers ?? this.allowNewMembers,
      maxParticipants: maxParticipants ?? this.maxParticipants,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (participantIds.present) {
      map['participant_ids'] = Variable<String>(participantIds.value);
    }
    if (createdBy.present) {
      map['created_by'] = Variable<String>(createdBy.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (lastMessageAt.present) {
      map['last_message_at'] = Variable<int>(lastMessageAt.value);
    }
    if (lastMessageId.present) {
      map['last_message_id'] = Variable<String>(lastMessageId.value);
    }
    if (lastMessagePreview.present) {
      map['last_message_preview'] = Variable<String>(lastMessagePreview.value);
    }
    if (lastMessageSenderId.present) {
      map['last_message_sender_id'] =
          Variable<String>(lastMessageSenderId.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(
          $InteractionsTableTable.$convertersyncStatus.toSql(syncStatus.value));
    }
    if (localId.present) {
      map['local_id'] = Variable<String>(localId.value);
    }
    if (serverTimestamp.present) {
      map['server_timestamp'] = Variable<int>(serverTimestamp.value);
    }
    if (isOptimistic.present) {
      map['is_optimistic'] = Variable<bool>(isOptimistic.value);
    }
    if (unreadCount.present) {
      map['unread_count'] = Variable<int>(unreadCount.value);
    }
    if (isPinned.present) {
      map['is_pinned'] = Variable<bool>(isPinned.value);
    }
    if (isMuted.present) {
      map['is_muted'] = Variable<bool>(isMuted.value);
    }
    if (isArchived.present) {
      map['is_archived'] = Variable<bool>(isArchived.value);
    }
    if (metadata.present) {
      map['metadata'] = Variable<String>(metadata.value);
    }
    if (avatarUrl.present) {
      map['avatar_url'] = Variable<String>(avatarUrl.value);
    }
    if (colorTheme.present) {
      map['color_theme'] = Variable<String>(colorTheme.value);
    }
    if (notificationSettings.present) {
      map['notification_settings'] =
          Variable<String>(notificationSettings.value);
    }
    if (tags.present) {
      map['tags'] = Variable<String>(tags.value);
    }
    if (lastAccessedAt.present) {
      map['last_accessed_at'] = Variable<int>(lastAccessedAt.value);
    }
    if (encryptionSettings.present) {
      map['encryption_settings'] = Variable<String>(encryptionSettings.value);
    }
    if (allowNewMembers.present) {
      map['allow_new_members'] = Variable<bool>(allowNewMembers.value);
    }
    if (maxParticipants.present) {
      map['max_participants'] = Variable<int>(maxParticipants.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('InteractionsTableCompanion(')
          ..write('id: $id, ')
          ..write('type: $type, ')
          ..write('status: $status, ')
          ..write('title: $title, ')
          ..write('description: $description, ')
          ..write('participantIds: $participantIds, ')
          ..write('createdBy: $createdBy, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastMessageAt: $lastMessageAt, ')
          ..write('lastMessageId: $lastMessageId, ')
          ..write('lastMessagePreview: $lastMessagePreview, ')
          ..write('lastMessageSenderId: $lastMessageSenderId, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('localId: $localId, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('isOptimistic: $isOptimistic, ')
          ..write('unreadCount: $unreadCount, ')
          ..write('isPinned: $isPinned, ')
          ..write('isMuted: $isMuted, ')
          ..write('isArchived: $isArchived, ')
          ..write('metadata: $metadata, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('colorTheme: $colorTheme, ')
          ..write('notificationSettings: $notificationSettings, ')
          ..write('tags: $tags, ')
          ..write('lastAccessedAt: $lastAccessedAt, ')
          ..write('encryptionSettings: $encryptionSettings, ')
          ..write('allowNewMembers: $allowNewMembers, ')
          ..write('maxParticipants: $maxParticipants, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $UsersTableTable extends UsersTable
    with TableInfo<$UsersTableTable, UserEntity> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $UsersTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _emailMeta = const VerificationMeta('email');
  @override
  late final GeneratedColumn<String> email = GeneratedColumn<String>(
      'email', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _phoneNumberMeta =
      const VerificationMeta('phoneNumber');
  @override
  late final GeneratedColumn<String> phoneNumber = GeneratedColumn<String>(
      'phone_number', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _displayNameMeta =
      const VerificationMeta('displayName');
  @override
  late final GeneratedColumn<String> displayName = GeneratedColumn<String>(
      'display_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _firstNameMeta =
      const VerificationMeta('firstName');
  @override
  late final GeneratedColumn<String> firstName = GeneratedColumn<String>(
      'first_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _lastNameMeta =
      const VerificationMeta('lastName');
  @override
  late final GeneratedColumn<String> lastName = GeneratedColumn<String>(
      'last_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _usernameMeta =
      const VerificationMeta('username');
  @override
  late final GeneratedColumn<String> username = GeneratedColumn<String>(
      'username', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _avatarUrlMeta =
      const VerificationMeta('avatarUrl');
  @override
  late final GeneratedColumn<String> avatarUrl = GeneratedColumn<String>(
      'avatar_url', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _bioMeta = const VerificationMeta('bio');
  @override
  late final GeneratedColumn<String> bio = GeneratedColumn<String>(
      'bio', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _dateOfBirthMeta =
      const VerificationMeta('dateOfBirth');
  @override
  late final GeneratedColumn<String> dateOfBirth = GeneratedColumn<String>(
      'date_of_birth', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _countryCodeMeta =
      const VerificationMeta('countryCode');
  @override
  late final GeneratedColumn<String> countryCode = GeneratedColumn<String>(
      'country_code', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _languageMeta =
      const VerificationMeta('language');
  @override
  late final GeneratedColumn<String> language = GeneratedColumn<String>(
      'language', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('en'));
  static const VerificationMeta _timezoneMeta =
      const VerificationMeta('timezone');
  @override
  late final GeneratedColumn<String> timezone = GeneratedColumn<String>(
      'timezone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _preferredCurrencyMeta =
      const VerificationMeta('preferredCurrency');
  @override
  late final GeneratedColumn<String> preferredCurrency =
      GeneratedColumn<String>('preferred_currency', aliasedName, false,
          type: DriftSqlType.string,
          requiredDuringInsert: false,
          defaultValue: const Constant('USD'));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('active'));
  static const VerificationMeta _accountTypeMeta =
      const VerificationMeta('accountType');
  @override
  late final GeneratedColumn<String> accountType = GeneratedColumn<String>(
      'account_type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('personal'));
  static const VerificationMeta _kycStatusMeta =
      const VerificationMeta('kycStatus');
  @override
  late final GeneratedColumn<String> kycStatus = GeneratedColumn<String>(
      'kyc_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _kycLevelMeta =
      const VerificationMeta('kycLevel');
  @override
  late final GeneratedColumn<int> kycLevel = GeneratedColumn<int>(
      'kyc_level', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _biometricEnabledMeta =
      const VerificationMeta('biometricEnabled');
  @override
  late final GeneratedColumn<bool> biometricEnabled = GeneratedColumn<bool>(
      'biometric_enabled', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("biometric_enabled" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _twoFactorEnabledMeta =
      const VerificationMeta('twoFactorEnabled');
  @override
  late final GeneratedColumn<bool> twoFactorEnabled = GeneratedColumn<bool>(
      'two_factor_enabled', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("two_factor_enabled" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _notificationPreferencesMeta =
      const VerificationMeta('notificationPreferences');
  @override
  late final GeneratedColumn<String> notificationPreferences =
      GeneratedColumn<String>('notification_preferences', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _privacySettingsMeta =
      const VerificationMeta('privacySettings');
  @override
  late final GeneratedColumn<String> privacySettings = GeneratedColumn<String>(
      'privacy_settings', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _lastSeenAtMeta =
      const VerificationMeta('lastSeenAt');
  @override
  late final GeneratedColumn<int> lastSeenAt = GeneratedColumn<int>(
      'last_seen_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _isOnlineMeta =
      const VerificationMeta('isOnline');
  @override
  late final GeneratedColumn<bool> isOnline = GeneratedColumn<bool>(
      'is_online', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_online" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  late final GeneratedColumnWithTypeConverter<SyncStatus, int> syncStatus =
      GeneratedColumn<int>('sync_status', aliasedName, false,
              type: DriftSqlType.int,
              requiredDuringInsert: false,
              defaultValue: const Constant(0))
          .withConverter<SyncStatus>($UsersTableTable.$convertersyncStatus);
  static const VerificationMeta _serverTimestampMeta =
      const VerificationMeta('serverTimestamp');
  @override
  late final GeneratedColumn<int> serverTimestamp = GeneratedColumn<int>(
      'server_timestamp', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _addressMeta =
      const VerificationMeta('address');
  @override
  late final GeneratedColumn<String> address = GeneratedColumn<String>(
      'address', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _socialLinksMeta =
      const VerificationMeta('socialLinks');
  @override
  late final GeneratedColumn<String> socialLinks = GeneratedColumn<String>(
      'social_links', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _emergencyContactMeta =
      const VerificationMeta('emergencyContact');
  @override
  late final GeneratedColumn<String> emergencyContact = GeneratedColumn<String>(
      'emergency_contact', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _employmentInfoMeta =
      const VerificationMeta('employmentInfo');
  @override
  late final GeneratedColumn<String> employmentInfo = GeneratedColumn<String>(
      'employment_info', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _metadataMeta =
      const VerificationMeta('metadata');
  @override
  late final GeneratedColumn<String> metadata = GeneratedColumn<String>(
      'metadata', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _referralCodeMeta =
      const VerificationMeta('referralCode');
  @override
  late final GeneratedColumn<String> referralCode = GeneratedColumn<String>(
      'referral_code', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _referredByMeta =
      const VerificationMeta('referredBy');
  @override
  late final GeneratedColumn<String> referredBy = GeneratedColumn<String>(
      'referred_by', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _referralCountMeta =
      const VerificationMeta('referralCount');
  @override
  late final GeneratedColumn<int> referralCount = GeneratedColumn<int>(
      'referral_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _trustScoreMeta =
      const VerificationMeta('trustScore');
  @override
  late final GeneratedColumn<double> trustScore = GeneratedColumn<double>(
      'trust_score', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _isVerifiedMeta =
      const VerificationMeta('isVerified');
  @override
  late final GeneratedColumn<bool> isVerified = GeneratedColumn<bool>(
      'is_verified', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_verified" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _isBusinessMeta =
      const VerificationMeta('isBusiness');
  @override
  late final GeneratedColumn<bool> isBusiness = GeneratedColumn<bool>(
      'is_business', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_business" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _businessInfoMeta =
      const VerificationMeta('businessInfo');
  @override
  late final GeneratedColumn<String> businessInfo = GeneratedColumn<String>(
      'business_info', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        email,
        phoneNumber,
        displayName,
        firstName,
        lastName,
        username,
        avatarUrl,
        bio,
        dateOfBirth,
        countryCode,
        language,
        timezone,
        preferredCurrency,
        status,
        accountType,
        kycStatus,
        kycLevel,
        biometricEnabled,
        twoFactorEnabled,
        notificationPreferences,
        privacySettings,
        createdAt,
        updatedAt,
        lastSeenAt,
        isOnline,
        syncStatus,
        serverTimestamp,
        address,
        socialLinks,
        emergencyContact,
        employmentInfo,
        metadata,
        referralCode,
        referredBy,
        referralCount,
        trustScore,
        isVerified,
        isBusiness,
        businessInfo
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'users_table';
  @override
  VerificationContext validateIntegrity(Insertable<UserEntity> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('email')) {
      context.handle(
          _emailMeta, email.isAcceptableOrUnknown(data['email']!, _emailMeta));
    }
    if (data.containsKey('phone_number')) {
      context.handle(
          _phoneNumberMeta,
          phoneNumber.isAcceptableOrUnknown(
              data['phone_number']!, _phoneNumberMeta));
    }
    if (data.containsKey('display_name')) {
      context.handle(
          _displayNameMeta,
          displayName.isAcceptableOrUnknown(
              data['display_name']!, _displayNameMeta));
    }
    if (data.containsKey('first_name')) {
      context.handle(_firstNameMeta,
          firstName.isAcceptableOrUnknown(data['first_name']!, _firstNameMeta));
    }
    if (data.containsKey('last_name')) {
      context.handle(_lastNameMeta,
          lastName.isAcceptableOrUnknown(data['last_name']!, _lastNameMeta));
    }
    if (data.containsKey('username')) {
      context.handle(_usernameMeta,
          username.isAcceptableOrUnknown(data['username']!, _usernameMeta));
    }
    if (data.containsKey('avatar_url')) {
      context.handle(_avatarUrlMeta,
          avatarUrl.isAcceptableOrUnknown(data['avatar_url']!, _avatarUrlMeta));
    }
    if (data.containsKey('bio')) {
      context.handle(
          _bioMeta, bio.isAcceptableOrUnknown(data['bio']!, _bioMeta));
    }
    if (data.containsKey('date_of_birth')) {
      context.handle(
          _dateOfBirthMeta,
          dateOfBirth.isAcceptableOrUnknown(
              data['date_of_birth']!, _dateOfBirthMeta));
    }
    if (data.containsKey('country_code')) {
      context.handle(
          _countryCodeMeta,
          countryCode.isAcceptableOrUnknown(
              data['country_code']!, _countryCodeMeta));
    }
    if (data.containsKey('language')) {
      context.handle(_languageMeta,
          language.isAcceptableOrUnknown(data['language']!, _languageMeta));
    }
    if (data.containsKey('timezone')) {
      context.handle(_timezoneMeta,
          timezone.isAcceptableOrUnknown(data['timezone']!, _timezoneMeta));
    }
    if (data.containsKey('preferred_currency')) {
      context.handle(
          _preferredCurrencyMeta,
          preferredCurrency.isAcceptableOrUnknown(
              data['preferred_currency']!, _preferredCurrencyMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('account_type')) {
      context.handle(
          _accountTypeMeta,
          accountType.isAcceptableOrUnknown(
              data['account_type']!, _accountTypeMeta));
    }
    if (data.containsKey('kyc_status')) {
      context.handle(_kycStatusMeta,
          kycStatus.isAcceptableOrUnknown(data['kyc_status']!, _kycStatusMeta));
    }
    if (data.containsKey('kyc_level')) {
      context.handle(_kycLevelMeta,
          kycLevel.isAcceptableOrUnknown(data['kyc_level']!, _kycLevelMeta));
    }
    if (data.containsKey('biometric_enabled')) {
      context.handle(
          _biometricEnabledMeta,
          biometricEnabled.isAcceptableOrUnknown(
              data['biometric_enabled']!, _biometricEnabledMeta));
    }
    if (data.containsKey('two_factor_enabled')) {
      context.handle(
          _twoFactorEnabledMeta,
          twoFactorEnabled.isAcceptableOrUnknown(
              data['two_factor_enabled']!, _twoFactorEnabledMeta));
    }
    if (data.containsKey('notification_preferences')) {
      context.handle(
          _notificationPreferencesMeta,
          notificationPreferences.isAcceptableOrUnknown(
              data['notification_preferences']!, _notificationPreferencesMeta));
    }
    if (data.containsKey('privacy_settings')) {
      context.handle(
          _privacySettingsMeta,
          privacySettings.isAcceptableOrUnknown(
              data['privacy_settings']!, _privacySettingsMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('last_seen_at')) {
      context.handle(
          _lastSeenAtMeta,
          lastSeenAt.isAcceptableOrUnknown(
              data['last_seen_at']!, _lastSeenAtMeta));
    }
    if (data.containsKey('is_online')) {
      context.handle(_isOnlineMeta,
          isOnline.isAcceptableOrUnknown(data['is_online']!, _isOnlineMeta));
    }
    if (data.containsKey('server_timestamp')) {
      context.handle(
          _serverTimestampMeta,
          serverTimestamp.isAcceptableOrUnknown(
              data['server_timestamp']!, _serverTimestampMeta));
    }
    if (data.containsKey('address')) {
      context.handle(_addressMeta,
          address.isAcceptableOrUnknown(data['address']!, _addressMeta));
    }
    if (data.containsKey('social_links')) {
      context.handle(
          _socialLinksMeta,
          socialLinks.isAcceptableOrUnknown(
              data['social_links']!, _socialLinksMeta));
    }
    if (data.containsKey('emergency_contact')) {
      context.handle(
          _emergencyContactMeta,
          emergencyContact.isAcceptableOrUnknown(
              data['emergency_contact']!, _emergencyContactMeta));
    }
    if (data.containsKey('employment_info')) {
      context.handle(
          _employmentInfoMeta,
          employmentInfo.isAcceptableOrUnknown(
              data['employment_info']!, _employmentInfoMeta));
    }
    if (data.containsKey('metadata')) {
      context.handle(_metadataMeta,
          metadata.isAcceptableOrUnknown(data['metadata']!, _metadataMeta));
    }
    if (data.containsKey('referral_code')) {
      context.handle(
          _referralCodeMeta,
          referralCode.isAcceptableOrUnknown(
              data['referral_code']!, _referralCodeMeta));
    }
    if (data.containsKey('referred_by')) {
      context.handle(
          _referredByMeta,
          referredBy.isAcceptableOrUnknown(
              data['referred_by']!, _referredByMeta));
    }
    if (data.containsKey('referral_count')) {
      context.handle(
          _referralCountMeta,
          referralCount.isAcceptableOrUnknown(
              data['referral_count']!, _referralCountMeta));
    }
    if (data.containsKey('trust_score')) {
      context.handle(
          _trustScoreMeta,
          trustScore.isAcceptableOrUnknown(
              data['trust_score']!, _trustScoreMeta));
    }
    if (data.containsKey('is_verified')) {
      context.handle(
          _isVerifiedMeta,
          isVerified.isAcceptableOrUnknown(
              data['is_verified']!, _isVerifiedMeta));
    }
    if (data.containsKey('is_business')) {
      context.handle(
          _isBusinessMeta,
          isBusiness.isAcceptableOrUnknown(
              data['is_business']!, _isBusinessMeta));
    }
    if (data.containsKey('business_info')) {
      context.handle(
          _businessInfoMeta,
          businessInfo.isAcceptableOrUnknown(
              data['business_info']!, _businessInfoMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  UserEntity map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return UserEntity(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      email: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}email']),
      phoneNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}phone_number']),
      displayName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}display_name']),
      firstName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}first_name']),
      lastName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_name']),
      username: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}username']),
      avatarUrl: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}avatar_url']),
      bio: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}bio']),
      dateOfBirth: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}date_of_birth']),
      countryCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}country_code']),
      language: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}language'])!,
      timezone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}timezone']),
      preferredCurrency: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}preferred_currency'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      accountType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}account_type'])!,
      kycStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kyc_status'])!,
      kycLevel: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}kyc_level'])!,
      biometricEnabled: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}biometric_enabled'])!,
      twoFactorEnabled: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}two_factor_enabled'])!,
      notificationPreferences: attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}notification_preferences']),
      privacySettings: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}privacy_settings']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
      lastSeenAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}last_seen_at']),
      isOnline: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_online'])!,
      syncStatus: $UsersTableTable.$convertersyncStatus.fromSql(attachedDatabase
          .typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sync_status'])!),
      serverTimestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}server_timestamp']),
      address: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}address']),
      socialLinks: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}social_links']),
      emergencyContact: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}emergency_contact']),
      employmentInfo: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}employment_info']),
      metadata: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}metadata']),
      referralCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}referral_code']),
      referredBy: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}referred_by']),
      referralCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}referral_count'])!,
      trustScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}trust_score']),
      isVerified: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_verified'])!,
      isBusiness: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_business'])!,
      businessInfo: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}business_info']),
    );
  }

  @override
  $UsersTableTable createAlias(String alias) {
    return $UsersTableTable(attachedDatabase, alias);
  }

  static JsonTypeConverter2<SyncStatus, int, int> $convertersyncStatus =
      const EnumIndexConverter<SyncStatus>(SyncStatus.values);
}

class UserEntity extends DataClass implements Insertable<UserEntity> {
  /// Primary key - user entity ID
  final String id;

  /// User's email address
  final String? email;

  /// User's phone number
  final String? phoneNumber;

  /// User's display name
  final String? displayName;

  /// User's first name
  final String? firstName;

  /// User's last name
  final String? lastName;

  /// User's username/handle
  final String? username;

  /// User's avatar/profile picture URL
  final String? avatarUrl;

  /// User's bio/description
  final String? bio;

  /// User's date of birth (ISO string)
  final String? dateOfBirth;

  /// User's country code
  final String? countryCode;

  /// User's preferred language
  final String language;

  /// User's timezone
  final String? timezone;

  /// User's preferred currency
  final String preferredCurrency;

  /// User account status (active, suspended, pending, etc.)
  final String status;

  /// User account type (personal, business, etc.)
  final String accountType;

  /// KYC verification status
  final String kycStatus;

  /// KYC verification level (1, 2, 3, etc.)
  final int kycLevel;

  /// Whether user has enabled biometric authentication
  final bool biometricEnabled;

  /// Whether user has enabled 2FA
  final bool twoFactorEnabled;

  /// User's notification preferences as JSON
  final String? notificationPreferences;

  /// User's privacy settings as JSON
  final String? privacySettings;

  /// When this user account was created (milliseconds since epoch)
  final int createdAt;

  /// When this user was last updated
  final int updatedAt;

  /// When this user was last seen online
  final int? lastSeenAt;

  /// Whether this user is currently online
  final bool isOnline;

  /// Sync status for offline-first architecture
  final SyncStatus syncStatus;

  /// Server-side timestamp for conflict resolution
  final int? serverTimestamp;

  /// User's address information as JSON
  final String? address;

  /// User's social media links as JSON
  final String? socialLinks;

  /// User's emergency contact information as JSON
  final String? emergencyContact;

  /// User's employment information as JSON
  final String? employmentInfo;

  /// Additional user metadata as JSON string
  final String? metadata;

  /// User's referral code
  final String? referralCode;

  /// ID of the user who referred this user
  final String? referredBy;

  /// Number of users this user has referred
  final int referralCount;

  /// User's trust score/rating
  final double? trustScore;

  /// Whether this user is verified (blue checkmark)
  final bool isVerified;

  /// Whether this user is a business account
  final bool isBusiness;

  /// Business information as JSON (if business account)
  final String? businessInfo;
  const UserEntity(
      {required this.id,
      this.email,
      this.phoneNumber,
      this.displayName,
      this.firstName,
      this.lastName,
      this.username,
      this.avatarUrl,
      this.bio,
      this.dateOfBirth,
      this.countryCode,
      required this.language,
      this.timezone,
      required this.preferredCurrency,
      required this.status,
      required this.accountType,
      required this.kycStatus,
      required this.kycLevel,
      required this.biometricEnabled,
      required this.twoFactorEnabled,
      this.notificationPreferences,
      this.privacySettings,
      required this.createdAt,
      required this.updatedAt,
      this.lastSeenAt,
      required this.isOnline,
      required this.syncStatus,
      this.serverTimestamp,
      this.address,
      this.socialLinks,
      this.emergencyContact,
      this.employmentInfo,
      this.metadata,
      this.referralCode,
      this.referredBy,
      required this.referralCount,
      this.trustScore,
      required this.isVerified,
      required this.isBusiness,
      this.businessInfo});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || email != null) {
      map['email'] = Variable<String>(email);
    }
    if (!nullToAbsent || phoneNumber != null) {
      map['phone_number'] = Variable<String>(phoneNumber);
    }
    if (!nullToAbsent || displayName != null) {
      map['display_name'] = Variable<String>(displayName);
    }
    if (!nullToAbsent || firstName != null) {
      map['first_name'] = Variable<String>(firstName);
    }
    if (!nullToAbsent || lastName != null) {
      map['last_name'] = Variable<String>(lastName);
    }
    if (!nullToAbsent || username != null) {
      map['username'] = Variable<String>(username);
    }
    if (!nullToAbsent || avatarUrl != null) {
      map['avatar_url'] = Variable<String>(avatarUrl);
    }
    if (!nullToAbsent || bio != null) {
      map['bio'] = Variable<String>(bio);
    }
    if (!nullToAbsent || dateOfBirth != null) {
      map['date_of_birth'] = Variable<String>(dateOfBirth);
    }
    if (!nullToAbsent || countryCode != null) {
      map['country_code'] = Variable<String>(countryCode);
    }
    map['language'] = Variable<String>(language);
    if (!nullToAbsent || timezone != null) {
      map['timezone'] = Variable<String>(timezone);
    }
    map['preferred_currency'] = Variable<String>(preferredCurrency);
    map['status'] = Variable<String>(status);
    map['account_type'] = Variable<String>(accountType);
    map['kyc_status'] = Variable<String>(kycStatus);
    map['kyc_level'] = Variable<int>(kycLevel);
    map['biometric_enabled'] = Variable<bool>(biometricEnabled);
    map['two_factor_enabled'] = Variable<bool>(twoFactorEnabled);
    if (!nullToAbsent || notificationPreferences != null) {
      map['notification_preferences'] =
          Variable<String>(notificationPreferences);
    }
    if (!nullToAbsent || privacySettings != null) {
      map['privacy_settings'] = Variable<String>(privacySettings);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || lastSeenAt != null) {
      map['last_seen_at'] = Variable<int>(lastSeenAt);
    }
    map['is_online'] = Variable<bool>(isOnline);
    {
      map['sync_status'] = Variable<int>(
          $UsersTableTable.$convertersyncStatus.toSql(syncStatus));
    }
    if (!nullToAbsent || serverTimestamp != null) {
      map['server_timestamp'] = Variable<int>(serverTimestamp);
    }
    if (!nullToAbsent || address != null) {
      map['address'] = Variable<String>(address);
    }
    if (!nullToAbsent || socialLinks != null) {
      map['social_links'] = Variable<String>(socialLinks);
    }
    if (!nullToAbsent || emergencyContact != null) {
      map['emergency_contact'] = Variable<String>(emergencyContact);
    }
    if (!nullToAbsent || employmentInfo != null) {
      map['employment_info'] = Variable<String>(employmentInfo);
    }
    if (!nullToAbsent || metadata != null) {
      map['metadata'] = Variable<String>(metadata);
    }
    if (!nullToAbsent || referralCode != null) {
      map['referral_code'] = Variable<String>(referralCode);
    }
    if (!nullToAbsent || referredBy != null) {
      map['referred_by'] = Variable<String>(referredBy);
    }
    map['referral_count'] = Variable<int>(referralCount);
    if (!nullToAbsent || trustScore != null) {
      map['trust_score'] = Variable<double>(trustScore);
    }
    map['is_verified'] = Variable<bool>(isVerified);
    map['is_business'] = Variable<bool>(isBusiness);
    if (!nullToAbsent || businessInfo != null) {
      map['business_info'] = Variable<String>(businessInfo);
    }
    return map;
  }

  UsersTableCompanion toCompanion(bool nullToAbsent) {
    return UsersTableCompanion(
      id: Value(id),
      email:
          email == null && nullToAbsent ? const Value.absent() : Value(email),
      phoneNumber: phoneNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(phoneNumber),
      displayName: displayName == null && nullToAbsent
          ? const Value.absent()
          : Value(displayName),
      firstName: firstName == null && nullToAbsent
          ? const Value.absent()
          : Value(firstName),
      lastName: lastName == null && nullToAbsent
          ? const Value.absent()
          : Value(lastName),
      username: username == null && nullToAbsent
          ? const Value.absent()
          : Value(username),
      avatarUrl: avatarUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(avatarUrl),
      bio: bio == null && nullToAbsent ? const Value.absent() : Value(bio),
      dateOfBirth: dateOfBirth == null && nullToAbsent
          ? const Value.absent()
          : Value(dateOfBirth),
      countryCode: countryCode == null && nullToAbsent
          ? const Value.absent()
          : Value(countryCode),
      language: Value(language),
      timezone: timezone == null && nullToAbsent
          ? const Value.absent()
          : Value(timezone),
      preferredCurrency: Value(preferredCurrency),
      status: Value(status),
      accountType: Value(accountType),
      kycStatus: Value(kycStatus),
      kycLevel: Value(kycLevel),
      biometricEnabled: Value(biometricEnabled),
      twoFactorEnabled: Value(twoFactorEnabled),
      notificationPreferences: notificationPreferences == null && nullToAbsent
          ? const Value.absent()
          : Value(notificationPreferences),
      privacySettings: privacySettings == null && nullToAbsent
          ? const Value.absent()
          : Value(privacySettings),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      lastSeenAt: lastSeenAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSeenAt),
      isOnline: Value(isOnline),
      syncStatus: Value(syncStatus),
      serverTimestamp: serverTimestamp == null && nullToAbsent
          ? const Value.absent()
          : Value(serverTimestamp),
      address: address == null && nullToAbsent
          ? const Value.absent()
          : Value(address),
      socialLinks: socialLinks == null && nullToAbsent
          ? const Value.absent()
          : Value(socialLinks),
      emergencyContact: emergencyContact == null && nullToAbsent
          ? const Value.absent()
          : Value(emergencyContact),
      employmentInfo: employmentInfo == null && nullToAbsent
          ? const Value.absent()
          : Value(employmentInfo),
      metadata: metadata == null && nullToAbsent
          ? const Value.absent()
          : Value(metadata),
      referralCode: referralCode == null && nullToAbsent
          ? const Value.absent()
          : Value(referralCode),
      referredBy: referredBy == null && nullToAbsent
          ? const Value.absent()
          : Value(referredBy),
      referralCount: Value(referralCount),
      trustScore: trustScore == null && nullToAbsent
          ? const Value.absent()
          : Value(trustScore),
      isVerified: Value(isVerified),
      isBusiness: Value(isBusiness),
      businessInfo: businessInfo == null && nullToAbsent
          ? const Value.absent()
          : Value(businessInfo),
    );
  }

  factory UserEntity.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return UserEntity(
      id: serializer.fromJson<String>(json['id']),
      email: serializer.fromJson<String?>(json['email']),
      phoneNumber: serializer.fromJson<String?>(json['phoneNumber']),
      displayName: serializer.fromJson<String?>(json['displayName']),
      firstName: serializer.fromJson<String?>(json['firstName']),
      lastName: serializer.fromJson<String?>(json['lastName']),
      username: serializer.fromJson<String?>(json['username']),
      avatarUrl: serializer.fromJson<String?>(json['avatarUrl']),
      bio: serializer.fromJson<String?>(json['bio']),
      dateOfBirth: serializer.fromJson<String?>(json['dateOfBirth']),
      countryCode: serializer.fromJson<String?>(json['countryCode']),
      language: serializer.fromJson<String>(json['language']),
      timezone: serializer.fromJson<String?>(json['timezone']),
      preferredCurrency: serializer.fromJson<String>(json['preferredCurrency']),
      status: serializer.fromJson<String>(json['status']),
      accountType: serializer.fromJson<String>(json['accountType']),
      kycStatus: serializer.fromJson<String>(json['kycStatus']),
      kycLevel: serializer.fromJson<int>(json['kycLevel']),
      biometricEnabled: serializer.fromJson<bool>(json['biometricEnabled']),
      twoFactorEnabled: serializer.fromJson<bool>(json['twoFactorEnabled']),
      notificationPreferences:
          serializer.fromJson<String?>(json['notificationPreferences']),
      privacySettings: serializer.fromJson<String?>(json['privacySettings']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      lastSeenAt: serializer.fromJson<int?>(json['lastSeenAt']),
      isOnline: serializer.fromJson<bool>(json['isOnline']),
      syncStatus: $UsersTableTable.$convertersyncStatus
          .fromJson(serializer.fromJson<int>(json['syncStatus'])),
      serverTimestamp: serializer.fromJson<int?>(json['serverTimestamp']),
      address: serializer.fromJson<String?>(json['address']),
      socialLinks: serializer.fromJson<String?>(json['socialLinks']),
      emergencyContact: serializer.fromJson<String?>(json['emergencyContact']),
      employmentInfo: serializer.fromJson<String?>(json['employmentInfo']),
      metadata: serializer.fromJson<String?>(json['metadata']),
      referralCode: serializer.fromJson<String?>(json['referralCode']),
      referredBy: serializer.fromJson<String?>(json['referredBy']),
      referralCount: serializer.fromJson<int>(json['referralCount']),
      trustScore: serializer.fromJson<double?>(json['trustScore']),
      isVerified: serializer.fromJson<bool>(json['isVerified']),
      isBusiness: serializer.fromJson<bool>(json['isBusiness']),
      businessInfo: serializer.fromJson<String?>(json['businessInfo']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'email': serializer.toJson<String?>(email),
      'phoneNumber': serializer.toJson<String?>(phoneNumber),
      'displayName': serializer.toJson<String?>(displayName),
      'firstName': serializer.toJson<String?>(firstName),
      'lastName': serializer.toJson<String?>(lastName),
      'username': serializer.toJson<String?>(username),
      'avatarUrl': serializer.toJson<String?>(avatarUrl),
      'bio': serializer.toJson<String?>(bio),
      'dateOfBirth': serializer.toJson<String?>(dateOfBirth),
      'countryCode': serializer.toJson<String?>(countryCode),
      'language': serializer.toJson<String>(language),
      'timezone': serializer.toJson<String?>(timezone),
      'preferredCurrency': serializer.toJson<String>(preferredCurrency),
      'status': serializer.toJson<String>(status),
      'accountType': serializer.toJson<String>(accountType),
      'kycStatus': serializer.toJson<String>(kycStatus),
      'kycLevel': serializer.toJson<int>(kycLevel),
      'biometricEnabled': serializer.toJson<bool>(biometricEnabled),
      'twoFactorEnabled': serializer.toJson<bool>(twoFactorEnabled),
      'notificationPreferences':
          serializer.toJson<String?>(notificationPreferences),
      'privacySettings': serializer.toJson<String?>(privacySettings),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'lastSeenAt': serializer.toJson<int?>(lastSeenAt),
      'isOnline': serializer.toJson<bool>(isOnline),
      'syncStatus': serializer.toJson<int>(
          $UsersTableTable.$convertersyncStatus.toJson(syncStatus)),
      'serverTimestamp': serializer.toJson<int?>(serverTimestamp),
      'address': serializer.toJson<String?>(address),
      'socialLinks': serializer.toJson<String?>(socialLinks),
      'emergencyContact': serializer.toJson<String?>(emergencyContact),
      'employmentInfo': serializer.toJson<String?>(employmentInfo),
      'metadata': serializer.toJson<String?>(metadata),
      'referralCode': serializer.toJson<String?>(referralCode),
      'referredBy': serializer.toJson<String?>(referredBy),
      'referralCount': serializer.toJson<int>(referralCount),
      'trustScore': serializer.toJson<double?>(trustScore),
      'isVerified': serializer.toJson<bool>(isVerified),
      'isBusiness': serializer.toJson<bool>(isBusiness),
      'businessInfo': serializer.toJson<String?>(businessInfo),
    };
  }

  UserEntity copyWith(
          {String? id,
          Value<String?> email = const Value.absent(),
          Value<String?> phoneNumber = const Value.absent(),
          Value<String?> displayName = const Value.absent(),
          Value<String?> firstName = const Value.absent(),
          Value<String?> lastName = const Value.absent(),
          Value<String?> username = const Value.absent(),
          Value<String?> avatarUrl = const Value.absent(),
          Value<String?> bio = const Value.absent(),
          Value<String?> dateOfBirth = const Value.absent(),
          Value<String?> countryCode = const Value.absent(),
          String? language,
          Value<String?> timezone = const Value.absent(),
          String? preferredCurrency,
          String? status,
          String? accountType,
          String? kycStatus,
          int? kycLevel,
          bool? biometricEnabled,
          bool? twoFactorEnabled,
          Value<String?> notificationPreferences = const Value.absent(),
          Value<String?> privacySettings = const Value.absent(),
          int? createdAt,
          int? updatedAt,
          Value<int?> lastSeenAt = const Value.absent(),
          bool? isOnline,
          SyncStatus? syncStatus,
          Value<int?> serverTimestamp = const Value.absent(),
          Value<String?> address = const Value.absent(),
          Value<String?> socialLinks = const Value.absent(),
          Value<String?> emergencyContact = const Value.absent(),
          Value<String?> employmentInfo = const Value.absent(),
          Value<String?> metadata = const Value.absent(),
          Value<String?> referralCode = const Value.absent(),
          Value<String?> referredBy = const Value.absent(),
          int? referralCount,
          Value<double?> trustScore = const Value.absent(),
          bool? isVerified,
          bool? isBusiness,
          Value<String?> businessInfo = const Value.absent()}) =>
      UserEntity(
        id: id ?? this.id,
        email: email.present ? email.value : this.email,
        phoneNumber: phoneNumber.present ? phoneNumber.value : this.phoneNumber,
        displayName: displayName.present ? displayName.value : this.displayName,
        firstName: firstName.present ? firstName.value : this.firstName,
        lastName: lastName.present ? lastName.value : this.lastName,
        username: username.present ? username.value : this.username,
        avatarUrl: avatarUrl.present ? avatarUrl.value : this.avatarUrl,
        bio: bio.present ? bio.value : this.bio,
        dateOfBirth: dateOfBirth.present ? dateOfBirth.value : this.dateOfBirth,
        countryCode: countryCode.present ? countryCode.value : this.countryCode,
        language: language ?? this.language,
        timezone: timezone.present ? timezone.value : this.timezone,
        preferredCurrency: preferredCurrency ?? this.preferredCurrency,
        status: status ?? this.status,
        accountType: accountType ?? this.accountType,
        kycStatus: kycStatus ?? this.kycStatus,
        kycLevel: kycLevel ?? this.kycLevel,
        biometricEnabled: biometricEnabled ?? this.biometricEnabled,
        twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
        notificationPreferences: notificationPreferences.present
            ? notificationPreferences.value
            : this.notificationPreferences,
        privacySettings: privacySettings.present
            ? privacySettings.value
            : this.privacySettings,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        lastSeenAt: lastSeenAt.present ? lastSeenAt.value : this.lastSeenAt,
        isOnline: isOnline ?? this.isOnline,
        syncStatus: syncStatus ?? this.syncStatus,
        serverTimestamp: serverTimestamp.present
            ? serverTimestamp.value
            : this.serverTimestamp,
        address: address.present ? address.value : this.address,
        socialLinks: socialLinks.present ? socialLinks.value : this.socialLinks,
        emergencyContact: emergencyContact.present
            ? emergencyContact.value
            : this.emergencyContact,
        employmentInfo:
            employmentInfo.present ? employmentInfo.value : this.employmentInfo,
        metadata: metadata.present ? metadata.value : this.metadata,
        referralCode:
            referralCode.present ? referralCode.value : this.referralCode,
        referredBy: referredBy.present ? referredBy.value : this.referredBy,
        referralCount: referralCount ?? this.referralCount,
        trustScore: trustScore.present ? trustScore.value : this.trustScore,
        isVerified: isVerified ?? this.isVerified,
        isBusiness: isBusiness ?? this.isBusiness,
        businessInfo:
            businessInfo.present ? businessInfo.value : this.businessInfo,
      );
  UserEntity copyWithCompanion(UsersTableCompanion data) {
    return UserEntity(
      id: data.id.present ? data.id.value : this.id,
      email: data.email.present ? data.email.value : this.email,
      phoneNumber:
          data.phoneNumber.present ? data.phoneNumber.value : this.phoneNumber,
      displayName:
          data.displayName.present ? data.displayName.value : this.displayName,
      firstName: data.firstName.present ? data.firstName.value : this.firstName,
      lastName: data.lastName.present ? data.lastName.value : this.lastName,
      username: data.username.present ? data.username.value : this.username,
      avatarUrl: data.avatarUrl.present ? data.avatarUrl.value : this.avatarUrl,
      bio: data.bio.present ? data.bio.value : this.bio,
      dateOfBirth:
          data.dateOfBirth.present ? data.dateOfBirth.value : this.dateOfBirth,
      countryCode:
          data.countryCode.present ? data.countryCode.value : this.countryCode,
      language: data.language.present ? data.language.value : this.language,
      timezone: data.timezone.present ? data.timezone.value : this.timezone,
      preferredCurrency: data.preferredCurrency.present
          ? data.preferredCurrency.value
          : this.preferredCurrency,
      status: data.status.present ? data.status.value : this.status,
      accountType:
          data.accountType.present ? data.accountType.value : this.accountType,
      kycStatus: data.kycStatus.present ? data.kycStatus.value : this.kycStatus,
      kycLevel: data.kycLevel.present ? data.kycLevel.value : this.kycLevel,
      biometricEnabled: data.biometricEnabled.present
          ? data.biometricEnabled.value
          : this.biometricEnabled,
      twoFactorEnabled: data.twoFactorEnabled.present
          ? data.twoFactorEnabled.value
          : this.twoFactorEnabled,
      notificationPreferences: data.notificationPreferences.present
          ? data.notificationPreferences.value
          : this.notificationPreferences,
      privacySettings: data.privacySettings.present
          ? data.privacySettings.value
          : this.privacySettings,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastSeenAt:
          data.lastSeenAt.present ? data.lastSeenAt.value : this.lastSeenAt,
      isOnline: data.isOnline.present ? data.isOnline.value : this.isOnline,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      serverTimestamp: data.serverTimestamp.present
          ? data.serverTimestamp.value
          : this.serverTimestamp,
      address: data.address.present ? data.address.value : this.address,
      socialLinks:
          data.socialLinks.present ? data.socialLinks.value : this.socialLinks,
      emergencyContact: data.emergencyContact.present
          ? data.emergencyContact.value
          : this.emergencyContact,
      employmentInfo: data.employmentInfo.present
          ? data.employmentInfo.value
          : this.employmentInfo,
      metadata: data.metadata.present ? data.metadata.value : this.metadata,
      referralCode: data.referralCode.present
          ? data.referralCode.value
          : this.referralCode,
      referredBy:
          data.referredBy.present ? data.referredBy.value : this.referredBy,
      referralCount: data.referralCount.present
          ? data.referralCount.value
          : this.referralCount,
      trustScore:
          data.trustScore.present ? data.trustScore.value : this.trustScore,
      isVerified:
          data.isVerified.present ? data.isVerified.value : this.isVerified,
      isBusiness:
          data.isBusiness.present ? data.isBusiness.value : this.isBusiness,
      businessInfo: data.businessInfo.present
          ? data.businessInfo.value
          : this.businessInfo,
    );
  }

  @override
  String toString() {
    return (StringBuffer('UserEntity(')
          ..write('id: $id, ')
          ..write('email: $email, ')
          ..write('phoneNumber: $phoneNumber, ')
          ..write('displayName: $displayName, ')
          ..write('firstName: $firstName, ')
          ..write('lastName: $lastName, ')
          ..write('username: $username, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('bio: $bio, ')
          ..write('dateOfBirth: $dateOfBirth, ')
          ..write('countryCode: $countryCode, ')
          ..write('language: $language, ')
          ..write('timezone: $timezone, ')
          ..write('preferredCurrency: $preferredCurrency, ')
          ..write('status: $status, ')
          ..write('accountType: $accountType, ')
          ..write('kycStatus: $kycStatus, ')
          ..write('kycLevel: $kycLevel, ')
          ..write('biometricEnabled: $biometricEnabled, ')
          ..write('twoFactorEnabled: $twoFactorEnabled, ')
          ..write('notificationPreferences: $notificationPreferences, ')
          ..write('privacySettings: $privacySettings, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSeenAt: $lastSeenAt, ')
          ..write('isOnline: $isOnline, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('address: $address, ')
          ..write('socialLinks: $socialLinks, ')
          ..write('emergencyContact: $emergencyContact, ')
          ..write('employmentInfo: $employmentInfo, ')
          ..write('metadata: $metadata, ')
          ..write('referralCode: $referralCode, ')
          ..write('referredBy: $referredBy, ')
          ..write('referralCount: $referralCount, ')
          ..write('trustScore: $trustScore, ')
          ..write('isVerified: $isVerified, ')
          ..write('isBusiness: $isBusiness, ')
          ..write('businessInfo: $businessInfo')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        email,
        phoneNumber,
        displayName,
        firstName,
        lastName,
        username,
        avatarUrl,
        bio,
        dateOfBirth,
        countryCode,
        language,
        timezone,
        preferredCurrency,
        status,
        accountType,
        kycStatus,
        kycLevel,
        biometricEnabled,
        twoFactorEnabled,
        notificationPreferences,
        privacySettings,
        createdAt,
        updatedAt,
        lastSeenAt,
        isOnline,
        syncStatus,
        serverTimestamp,
        address,
        socialLinks,
        emergencyContact,
        employmentInfo,
        metadata,
        referralCode,
        referredBy,
        referralCount,
        trustScore,
        isVerified,
        isBusiness,
        businessInfo
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is UserEntity &&
          other.id == this.id &&
          other.email == this.email &&
          other.phoneNumber == this.phoneNumber &&
          other.displayName == this.displayName &&
          other.firstName == this.firstName &&
          other.lastName == this.lastName &&
          other.username == this.username &&
          other.avatarUrl == this.avatarUrl &&
          other.bio == this.bio &&
          other.dateOfBirth == this.dateOfBirth &&
          other.countryCode == this.countryCode &&
          other.language == this.language &&
          other.timezone == this.timezone &&
          other.preferredCurrency == this.preferredCurrency &&
          other.status == this.status &&
          other.accountType == this.accountType &&
          other.kycStatus == this.kycStatus &&
          other.kycLevel == this.kycLevel &&
          other.biometricEnabled == this.biometricEnabled &&
          other.twoFactorEnabled == this.twoFactorEnabled &&
          other.notificationPreferences == this.notificationPreferences &&
          other.privacySettings == this.privacySettings &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastSeenAt == this.lastSeenAt &&
          other.isOnline == this.isOnline &&
          other.syncStatus == this.syncStatus &&
          other.serverTimestamp == this.serverTimestamp &&
          other.address == this.address &&
          other.socialLinks == this.socialLinks &&
          other.emergencyContact == this.emergencyContact &&
          other.employmentInfo == this.employmentInfo &&
          other.metadata == this.metadata &&
          other.referralCode == this.referralCode &&
          other.referredBy == this.referredBy &&
          other.referralCount == this.referralCount &&
          other.trustScore == this.trustScore &&
          other.isVerified == this.isVerified &&
          other.isBusiness == this.isBusiness &&
          other.businessInfo == this.businessInfo);
}

class UsersTableCompanion extends UpdateCompanion<UserEntity> {
  final Value<String> id;
  final Value<String?> email;
  final Value<String?> phoneNumber;
  final Value<String?> displayName;
  final Value<String?> firstName;
  final Value<String?> lastName;
  final Value<String?> username;
  final Value<String?> avatarUrl;
  final Value<String?> bio;
  final Value<String?> dateOfBirth;
  final Value<String?> countryCode;
  final Value<String> language;
  final Value<String?> timezone;
  final Value<String> preferredCurrency;
  final Value<String> status;
  final Value<String> accountType;
  final Value<String> kycStatus;
  final Value<int> kycLevel;
  final Value<bool> biometricEnabled;
  final Value<bool> twoFactorEnabled;
  final Value<String?> notificationPreferences;
  final Value<String?> privacySettings;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> lastSeenAt;
  final Value<bool> isOnline;
  final Value<SyncStatus> syncStatus;
  final Value<int?> serverTimestamp;
  final Value<String?> address;
  final Value<String?> socialLinks;
  final Value<String?> emergencyContact;
  final Value<String?> employmentInfo;
  final Value<String?> metadata;
  final Value<String?> referralCode;
  final Value<String?> referredBy;
  final Value<int> referralCount;
  final Value<double?> trustScore;
  final Value<bool> isVerified;
  final Value<bool> isBusiness;
  final Value<String?> businessInfo;
  final Value<int> rowid;
  const UsersTableCompanion({
    this.id = const Value.absent(),
    this.email = const Value.absent(),
    this.phoneNumber = const Value.absent(),
    this.displayName = const Value.absent(),
    this.firstName = const Value.absent(),
    this.lastName = const Value.absent(),
    this.username = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.bio = const Value.absent(),
    this.dateOfBirth = const Value.absent(),
    this.countryCode = const Value.absent(),
    this.language = const Value.absent(),
    this.timezone = const Value.absent(),
    this.preferredCurrency = const Value.absent(),
    this.status = const Value.absent(),
    this.accountType = const Value.absent(),
    this.kycStatus = const Value.absent(),
    this.kycLevel = const Value.absent(),
    this.biometricEnabled = const Value.absent(),
    this.twoFactorEnabled = const Value.absent(),
    this.notificationPreferences = const Value.absent(),
    this.privacySettings = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSeenAt = const Value.absent(),
    this.isOnline = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.address = const Value.absent(),
    this.socialLinks = const Value.absent(),
    this.emergencyContact = const Value.absent(),
    this.employmentInfo = const Value.absent(),
    this.metadata = const Value.absent(),
    this.referralCode = const Value.absent(),
    this.referredBy = const Value.absent(),
    this.referralCount = const Value.absent(),
    this.trustScore = const Value.absent(),
    this.isVerified = const Value.absent(),
    this.isBusiness = const Value.absent(),
    this.businessInfo = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  UsersTableCompanion.insert({
    required String id,
    this.email = const Value.absent(),
    this.phoneNumber = const Value.absent(),
    this.displayName = const Value.absent(),
    this.firstName = const Value.absent(),
    this.lastName = const Value.absent(),
    this.username = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.bio = const Value.absent(),
    this.dateOfBirth = const Value.absent(),
    this.countryCode = const Value.absent(),
    this.language = const Value.absent(),
    this.timezone = const Value.absent(),
    this.preferredCurrency = const Value.absent(),
    this.status = const Value.absent(),
    this.accountType = const Value.absent(),
    this.kycStatus = const Value.absent(),
    this.kycLevel = const Value.absent(),
    this.biometricEnabled = const Value.absent(),
    this.twoFactorEnabled = const Value.absent(),
    this.notificationPreferences = const Value.absent(),
    this.privacySettings = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSeenAt = const Value.absent(),
    this.isOnline = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.serverTimestamp = const Value.absent(),
    this.address = const Value.absent(),
    this.socialLinks = const Value.absent(),
    this.emergencyContact = const Value.absent(),
    this.employmentInfo = const Value.absent(),
    this.metadata = const Value.absent(),
    this.referralCode = const Value.absent(),
    this.referredBy = const Value.absent(),
    this.referralCount = const Value.absent(),
    this.trustScore = const Value.absent(),
    this.isVerified = const Value.absent(),
    this.isBusiness = const Value.absent(),
    this.businessInfo = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id);
  static Insertable<UserEntity> custom({
    Expression<String>? id,
    Expression<String>? email,
    Expression<String>? phoneNumber,
    Expression<String>? displayName,
    Expression<String>? firstName,
    Expression<String>? lastName,
    Expression<String>? username,
    Expression<String>? avatarUrl,
    Expression<String>? bio,
    Expression<String>? dateOfBirth,
    Expression<String>? countryCode,
    Expression<String>? language,
    Expression<String>? timezone,
    Expression<String>? preferredCurrency,
    Expression<String>? status,
    Expression<String>? accountType,
    Expression<String>? kycStatus,
    Expression<int>? kycLevel,
    Expression<bool>? biometricEnabled,
    Expression<bool>? twoFactorEnabled,
    Expression<String>? notificationPreferences,
    Expression<String>? privacySettings,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? lastSeenAt,
    Expression<bool>? isOnline,
    Expression<int>? syncStatus,
    Expression<int>? serverTimestamp,
    Expression<String>? address,
    Expression<String>? socialLinks,
    Expression<String>? emergencyContact,
    Expression<String>? employmentInfo,
    Expression<String>? metadata,
    Expression<String>? referralCode,
    Expression<String>? referredBy,
    Expression<int>? referralCount,
    Expression<double>? trustScore,
    Expression<bool>? isVerified,
    Expression<bool>? isBusiness,
    Expression<String>? businessInfo,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (email != null) 'email': email,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      if (displayName != null) 'display_name': displayName,
      if (firstName != null) 'first_name': firstName,
      if (lastName != null) 'last_name': lastName,
      if (username != null) 'username': username,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (bio != null) 'bio': bio,
      if (dateOfBirth != null) 'date_of_birth': dateOfBirth,
      if (countryCode != null) 'country_code': countryCode,
      if (language != null) 'language': language,
      if (timezone != null) 'timezone': timezone,
      if (preferredCurrency != null) 'preferred_currency': preferredCurrency,
      if (status != null) 'status': status,
      if (accountType != null) 'account_type': accountType,
      if (kycStatus != null) 'kyc_status': kycStatus,
      if (kycLevel != null) 'kyc_level': kycLevel,
      if (biometricEnabled != null) 'biometric_enabled': biometricEnabled,
      if (twoFactorEnabled != null) 'two_factor_enabled': twoFactorEnabled,
      if (notificationPreferences != null)
        'notification_preferences': notificationPreferences,
      if (privacySettings != null) 'privacy_settings': privacySettings,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastSeenAt != null) 'last_seen_at': lastSeenAt,
      if (isOnline != null) 'is_online': isOnline,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (serverTimestamp != null) 'server_timestamp': serverTimestamp,
      if (address != null) 'address': address,
      if (socialLinks != null) 'social_links': socialLinks,
      if (emergencyContact != null) 'emergency_contact': emergencyContact,
      if (employmentInfo != null) 'employment_info': employmentInfo,
      if (metadata != null) 'metadata': metadata,
      if (referralCode != null) 'referral_code': referralCode,
      if (referredBy != null) 'referred_by': referredBy,
      if (referralCount != null) 'referral_count': referralCount,
      if (trustScore != null) 'trust_score': trustScore,
      if (isVerified != null) 'is_verified': isVerified,
      if (isBusiness != null) 'is_business': isBusiness,
      if (businessInfo != null) 'business_info': businessInfo,
      if (rowid != null) 'rowid': rowid,
    });
  }

  UsersTableCompanion copyWith(
      {Value<String>? id,
      Value<String?>? email,
      Value<String?>? phoneNumber,
      Value<String?>? displayName,
      Value<String?>? firstName,
      Value<String?>? lastName,
      Value<String?>? username,
      Value<String?>? avatarUrl,
      Value<String?>? bio,
      Value<String?>? dateOfBirth,
      Value<String?>? countryCode,
      Value<String>? language,
      Value<String?>? timezone,
      Value<String>? preferredCurrency,
      Value<String>? status,
      Value<String>? accountType,
      Value<String>? kycStatus,
      Value<int>? kycLevel,
      Value<bool>? biometricEnabled,
      Value<bool>? twoFactorEnabled,
      Value<String?>? notificationPreferences,
      Value<String?>? privacySettings,
      Value<int>? createdAt,
      Value<int>? updatedAt,
      Value<int?>? lastSeenAt,
      Value<bool>? isOnline,
      Value<SyncStatus>? syncStatus,
      Value<int?>? serverTimestamp,
      Value<String?>? address,
      Value<String?>? socialLinks,
      Value<String?>? emergencyContact,
      Value<String?>? employmentInfo,
      Value<String?>? metadata,
      Value<String?>? referralCode,
      Value<String?>? referredBy,
      Value<int>? referralCount,
      Value<double?>? trustScore,
      Value<bool>? isVerified,
      Value<bool>? isBusiness,
      Value<String?>? businessInfo,
      Value<int>? rowid}) {
    return UsersTableCompanion(
      id: id ?? this.id,
      email: email ?? this.email,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      displayName: displayName ?? this.displayName,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      username: username ?? this.username,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      countryCode: countryCode ?? this.countryCode,
      language: language ?? this.language,
      timezone: timezone ?? this.timezone,
      preferredCurrency: preferredCurrency ?? this.preferredCurrency,
      status: status ?? this.status,
      accountType: accountType ?? this.accountType,
      kycStatus: kycStatus ?? this.kycStatus,
      kycLevel: kycLevel ?? this.kycLevel,
      biometricEnabled: biometricEnabled ?? this.biometricEnabled,
      twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
      notificationPreferences:
          notificationPreferences ?? this.notificationPreferences,
      privacySettings: privacySettings ?? this.privacySettings,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSeenAt: lastSeenAt ?? this.lastSeenAt,
      isOnline: isOnline ?? this.isOnline,
      syncStatus: syncStatus ?? this.syncStatus,
      serverTimestamp: serverTimestamp ?? this.serverTimestamp,
      address: address ?? this.address,
      socialLinks: socialLinks ?? this.socialLinks,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      employmentInfo: employmentInfo ?? this.employmentInfo,
      metadata: metadata ?? this.metadata,
      referralCode: referralCode ?? this.referralCode,
      referredBy: referredBy ?? this.referredBy,
      referralCount: referralCount ?? this.referralCount,
      trustScore: trustScore ?? this.trustScore,
      isVerified: isVerified ?? this.isVerified,
      isBusiness: isBusiness ?? this.isBusiness,
      businessInfo: businessInfo ?? this.businessInfo,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (email.present) {
      map['email'] = Variable<String>(email.value);
    }
    if (phoneNumber.present) {
      map['phone_number'] = Variable<String>(phoneNumber.value);
    }
    if (displayName.present) {
      map['display_name'] = Variable<String>(displayName.value);
    }
    if (firstName.present) {
      map['first_name'] = Variable<String>(firstName.value);
    }
    if (lastName.present) {
      map['last_name'] = Variable<String>(lastName.value);
    }
    if (username.present) {
      map['username'] = Variable<String>(username.value);
    }
    if (avatarUrl.present) {
      map['avatar_url'] = Variable<String>(avatarUrl.value);
    }
    if (bio.present) {
      map['bio'] = Variable<String>(bio.value);
    }
    if (dateOfBirth.present) {
      map['date_of_birth'] = Variable<String>(dateOfBirth.value);
    }
    if (countryCode.present) {
      map['country_code'] = Variable<String>(countryCode.value);
    }
    if (language.present) {
      map['language'] = Variable<String>(language.value);
    }
    if (timezone.present) {
      map['timezone'] = Variable<String>(timezone.value);
    }
    if (preferredCurrency.present) {
      map['preferred_currency'] = Variable<String>(preferredCurrency.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (accountType.present) {
      map['account_type'] = Variable<String>(accountType.value);
    }
    if (kycStatus.present) {
      map['kyc_status'] = Variable<String>(kycStatus.value);
    }
    if (kycLevel.present) {
      map['kyc_level'] = Variable<int>(kycLevel.value);
    }
    if (biometricEnabled.present) {
      map['biometric_enabled'] = Variable<bool>(biometricEnabled.value);
    }
    if (twoFactorEnabled.present) {
      map['two_factor_enabled'] = Variable<bool>(twoFactorEnabled.value);
    }
    if (notificationPreferences.present) {
      map['notification_preferences'] =
          Variable<String>(notificationPreferences.value);
    }
    if (privacySettings.present) {
      map['privacy_settings'] = Variable<String>(privacySettings.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (lastSeenAt.present) {
      map['last_seen_at'] = Variable<int>(lastSeenAt.value);
    }
    if (isOnline.present) {
      map['is_online'] = Variable<bool>(isOnline.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(
          $UsersTableTable.$convertersyncStatus.toSql(syncStatus.value));
    }
    if (serverTimestamp.present) {
      map['server_timestamp'] = Variable<int>(serverTimestamp.value);
    }
    if (address.present) {
      map['address'] = Variable<String>(address.value);
    }
    if (socialLinks.present) {
      map['social_links'] = Variable<String>(socialLinks.value);
    }
    if (emergencyContact.present) {
      map['emergency_contact'] = Variable<String>(emergencyContact.value);
    }
    if (employmentInfo.present) {
      map['employment_info'] = Variable<String>(employmentInfo.value);
    }
    if (metadata.present) {
      map['metadata'] = Variable<String>(metadata.value);
    }
    if (referralCode.present) {
      map['referral_code'] = Variable<String>(referralCode.value);
    }
    if (referredBy.present) {
      map['referred_by'] = Variable<String>(referredBy.value);
    }
    if (referralCount.present) {
      map['referral_count'] = Variable<int>(referralCount.value);
    }
    if (trustScore.present) {
      map['trust_score'] = Variable<double>(trustScore.value);
    }
    if (isVerified.present) {
      map['is_verified'] = Variable<bool>(isVerified.value);
    }
    if (isBusiness.present) {
      map['is_business'] = Variable<bool>(isBusiness.value);
    }
    if (businessInfo.present) {
      map['business_info'] = Variable<String>(businessInfo.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('UsersTableCompanion(')
          ..write('id: $id, ')
          ..write('email: $email, ')
          ..write('phoneNumber: $phoneNumber, ')
          ..write('displayName: $displayName, ')
          ..write('firstName: $firstName, ')
          ..write('lastName: $lastName, ')
          ..write('username: $username, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('bio: $bio, ')
          ..write('dateOfBirth: $dateOfBirth, ')
          ..write('countryCode: $countryCode, ')
          ..write('language: $language, ')
          ..write('timezone: $timezone, ')
          ..write('preferredCurrency: $preferredCurrency, ')
          ..write('status: $status, ')
          ..write('accountType: $accountType, ')
          ..write('kycStatus: $kycStatus, ')
          ..write('kycLevel: $kycLevel, ')
          ..write('biometricEnabled: $biometricEnabled, ')
          ..write('twoFactorEnabled: $twoFactorEnabled, ')
          ..write('notificationPreferences: $notificationPreferences, ')
          ..write('privacySettings: $privacySettings, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSeenAt: $lastSeenAt, ')
          ..write('isOnline: $isOnline, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('serverTimestamp: $serverTimestamp, ')
          ..write('address: $address, ')
          ..write('socialLinks: $socialLinks, ')
          ..write('emergencyContact: $emergencyContact, ')
          ..write('employmentInfo: $employmentInfo, ')
          ..write('metadata: $metadata, ')
          ..write('referralCode: $referralCode, ')
          ..write('referredBy: $referredBy, ')
          ..write('referralCount: $referralCount, ')
          ..write('trustScore: $trustScore, ')
          ..write('isVerified: $isVerified, ')
          ..write('isBusiness: $isBusiness, ')
          ..write('businessInfo: $businessInfo, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $TransactionsTableTable transactionsTable =
      $TransactionsTableTable(this);
  late final $BalancesTableTable balancesTable = $BalancesTableTable(this);
  late final $MessagesTableTable messagesTable = $MessagesTableTable(this);
  late final $InteractionsTableTable interactionsTable =
      $InteractionsTableTable(this);
  late final $UsersTableTable usersTable = $UsersTableTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        transactionsTable,
        balancesTable,
        messagesTable,
        interactionsTable,
        usersTable
      ];
}

typedef $$TransactionsTableTableCreateCompanionBuilder
    = TransactionsTableCompanion Function({
  required String id,
  required String userId,
  required double amount,
  required String description,
  Value<String?> category,
  Value<String> currencyCode,
  required String type,
  Value<String> status,
  Value<String?> recipientId,
  Value<String?> senderId,
  Value<String?> interactionId,
  required String accountId,
  Value<String?> walletId,
  required int timestamp,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<SyncStatus> syncStatus,
  Value<String?> localId,
  Value<int?> serverTimestamp,
  Value<String?> metadata,
  Value<String?> externalId,
  Value<double> fees,
  Value<double?> exchangeRate,
  Value<String?> location,
  Value<String?> source,
  Value<int> rowid,
});
typedef $$TransactionsTableTableUpdateCompanionBuilder
    = TransactionsTableCompanion Function({
  Value<String> id,
  Value<String> userId,
  Value<double> amount,
  Value<String> description,
  Value<String?> category,
  Value<String> currencyCode,
  Value<String> type,
  Value<String> status,
  Value<String?> recipientId,
  Value<String?> senderId,
  Value<String?> interactionId,
  Value<String> accountId,
  Value<String?> walletId,
  Value<int> timestamp,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<SyncStatus> syncStatus,
  Value<String?> localId,
  Value<int?> serverTimestamp,
  Value<String?> metadata,
  Value<String?> externalId,
  Value<double> fees,
  Value<double?> exchangeRate,
  Value<String?> location,
  Value<String?> source,
  Value<int> rowid,
});

class $$TransactionsTableTableFilterComposer
    extends Composer<_$AppDatabase, $TransactionsTableTable> {
  $$TransactionsTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currencyCode => $composableBuilder(
      column: $table.currencyCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get recipientId => $composableBuilder(
      column: $table.recipientId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get senderId => $composableBuilder(
      column: $table.senderId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get interactionId => $composableBuilder(
      column: $table.interactionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get accountId => $composableBuilder(
      column: $table.accountId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get walletId => $composableBuilder(
      column: $table.walletId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnWithTypeConverterFilters<SyncStatus, SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus,
          builder: (column) => ColumnWithTypeConverterFilters(column));

  ColumnFilters<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get externalId => $composableBuilder(
      column: $table.externalId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get fees => $composableBuilder(
      column: $table.fees, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get exchangeRate => $composableBuilder(
      column: $table.exchangeRate, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get location => $composableBuilder(
      column: $table.location, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get source => $composableBuilder(
      column: $table.source, builder: (column) => ColumnFilters(column));
}

class $$TransactionsTableTableOrderingComposer
    extends Composer<_$AppDatabase, $TransactionsTableTable> {
  $$TransactionsTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currencyCode => $composableBuilder(
      column: $table.currencyCode,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get recipientId => $composableBuilder(
      column: $table.recipientId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get senderId => $composableBuilder(
      column: $table.senderId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get interactionId => $composableBuilder(
      column: $table.interactionId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get accountId => $composableBuilder(
      column: $table.accountId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get walletId => $composableBuilder(
      column: $table.walletId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get externalId => $composableBuilder(
      column: $table.externalId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get fees => $composableBuilder(
      column: $table.fees, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get exchangeRate => $composableBuilder(
      column: $table.exchangeRate,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get location => $composableBuilder(
      column: $table.location, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get source => $composableBuilder(
      column: $table.source, builder: (column) => ColumnOrderings(column));
}

class $$TransactionsTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $TransactionsTableTable> {
  $$TransactionsTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<String> get currencyCode => $composableBuilder(
      column: $table.currencyCode, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get recipientId => $composableBuilder(
      column: $table.recipientId, builder: (column) => column);

  GeneratedColumn<String> get senderId =>
      $composableBuilder(column: $table.senderId, builder: (column) => column);

  GeneratedColumn<String> get interactionId => $composableBuilder(
      column: $table.interactionId, builder: (column) => column);

  GeneratedColumn<String> get accountId =>
      $composableBuilder(column: $table.accountId, builder: (column) => column);

  GeneratedColumn<String> get walletId =>
      $composableBuilder(column: $table.walletId, builder: (column) => column);

  GeneratedColumn<int> get timestamp =>
      $composableBuilder(column: $table.timestamp, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumnWithTypeConverter<SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get localId =>
      $composableBuilder(column: $table.localId, builder: (column) => column);

  GeneratedColumn<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp, builder: (column) => column);

  GeneratedColumn<String> get metadata =>
      $composableBuilder(column: $table.metadata, builder: (column) => column);

  GeneratedColumn<String> get externalId => $composableBuilder(
      column: $table.externalId, builder: (column) => column);

  GeneratedColumn<double> get fees =>
      $composableBuilder(column: $table.fees, builder: (column) => column);

  GeneratedColumn<double> get exchangeRate => $composableBuilder(
      column: $table.exchangeRate, builder: (column) => column);

  GeneratedColumn<String> get location =>
      $composableBuilder(column: $table.location, builder: (column) => column);

  GeneratedColumn<String> get source =>
      $composableBuilder(column: $table.source, builder: (column) => column);
}

class $$TransactionsTableTableTableManager extends RootTableManager<
    _$AppDatabase,
    $TransactionsTableTable,
    TransactionEntity,
    $$TransactionsTableTableFilterComposer,
    $$TransactionsTableTableOrderingComposer,
    $$TransactionsTableTableAnnotationComposer,
    $$TransactionsTableTableCreateCompanionBuilder,
    $$TransactionsTableTableUpdateCompanionBuilder,
    (
      TransactionEntity,
      BaseReferences<_$AppDatabase, $TransactionsTableTable, TransactionEntity>
    ),
    TransactionEntity,
    PrefetchHooks Function()> {
  $$TransactionsTableTableTableManager(
      _$AppDatabase db, $TransactionsTableTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TransactionsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TransactionsTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TransactionsTableTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> userId = const Value.absent(),
            Value<double> amount = const Value.absent(),
            Value<String> description = const Value.absent(),
            Value<String?> category = const Value.absent(),
            Value<String> currencyCode = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String?> recipientId = const Value.absent(),
            Value<String?> senderId = const Value.absent(),
            Value<String?> interactionId = const Value.absent(),
            Value<String> accountId = const Value.absent(),
            Value<String?> walletId = const Value.absent(),
            Value<int> timestamp = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<String?> localId = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<String?> externalId = const Value.absent(),
            Value<double> fees = const Value.absent(),
            Value<double?> exchangeRate = const Value.absent(),
            Value<String?> location = const Value.absent(),
            Value<String?> source = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              TransactionsTableCompanion(
            id: id,
            userId: userId,
            amount: amount,
            description: description,
            category: category,
            currencyCode: currencyCode,
            type: type,
            status: status,
            recipientId: recipientId,
            senderId: senderId,
            interactionId: interactionId,
            accountId: accountId,
            walletId: walletId,
            timestamp: timestamp,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncStatus: syncStatus,
            localId: localId,
            serverTimestamp: serverTimestamp,
            metadata: metadata,
            externalId: externalId,
            fees: fees,
            exchangeRate: exchangeRate,
            location: location,
            source: source,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String userId,
            required double amount,
            required String description,
            Value<String?> category = const Value.absent(),
            Value<String> currencyCode = const Value.absent(),
            required String type,
            Value<String> status = const Value.absent(),
            Value<String?> recipientId = const Value.absent(),
            Value<String?> senderId = const Value.absent(),
            Value<String?> interactionId = const Value.absent(),
            required String accountId,
            Value<String?> walletId = const Value.absent(),
            required int timestamp,
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<String?> localId = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<String?> externalId = const Value.absent(),
            Value<double> fees = const Value.absent(),
            Value<double?> exchangeRate = const Value.absent(),
            Value<String?> location = const Value.absent(),
            Value<String?> source = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              TransactionsTableCompanion.insert(
            id: id,
            userId: userId,
            amount: amount,
            description: description,
            category: category,
            currencyCode: currencyCode,
            type: type,
            status: status,
            recipientId: recipientId,
            senderId: senderId,
            interactionId: interactionId,
            accountId: accountId,
            walletId: walletId,
            timestamp: timestamp,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncStatus: syncStatus,
            localId: localId,
            serverTimestamp: serverTimestamp,
            metadata: metadata,
            externalId: externalId,
            fees: fees,
            exchangeRate: exchangeRate,
            location: location,
            source: source,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$TransactionsTableTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $TransactionsTableTable,
    TransactionEntity,
    $$TransactionsTableTableFilterComposer,
    $$TransactionsTableTableOrderingComposer,
    $$TransactionsTableTableAnnotationComposer,
    $$TransactionsTableTableCreateCompanionBuilder,
    $$TransactionsTableTableUpdateCompanionBuilder,
    (
      TransactionEntity,
      BaseReferences<_$AppDatabase, $TransactionsTableTable, TransactionEntity>
    ),
    TransactionEntity,
    PrefetchHooks Function()>;
typedef $$BalancesTableTableCreateCompanionBuilder = BalancesTableCompanion
    Function({
  required String userId,
  required String accountId,
  required String currencyCode,
  Value<double> amount,
  Value<double> availableAmount,
  Value<double> pendingAmount,
  Value<double> holdAmount,
  Value<int> lastUpdated,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<SyncStatus> syncStatus,
  Value<int?> serverTimestamp,
  Value<String?> walletId,
  Value<String> balanceType,
  Value<bool> isPrimary,
  Value<String?> metadata,
  Value<double?> interestRate,
  Value<double?> creditLimit,
  Value<double> minimumBalance,
  Value<int> rowid,
});
typedef $$BalancesTableTableUpdateCompanionBuilder = BalancesTableCompanion
    Function({
  Value<String> userId,
  Value<String> accountId,
  Value<String> currencyCode,
  Value<double> amount,
  Value<double> availableAmount,
  Value<double> pendingAmount,
  Value<double> holdAmount,
  Value<int> lastUpdated,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<SyncStatus> syncStatus,
  Value<int?> serverTimestamp,
  Value<String?> walletId,
  Value<String> balanceType,
  Value<bool> isPrimary,
  Value<String?> metadata,
  Value<double?> interestRate,
  Value<double?> creditLimit,
  Value<double> minimumBalance,
  Value<int> rowid,
});

class $$BalancesTableTableFilterComposer
    extends Composer<_$AppDatabase, $BalancesTableTable> {
  $$BalancesTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get accountId => $composableBuilder(
      column: $table.accountId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currencyCode => $composableBuilder(
      column: $table.currencyCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get availableAmount => $composableBuilder(
      column: $table.availableAmount,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get pendingAmount => $composableBuilder(
      column: $table.pendingAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get holdAmount => $composableBuilder(
      column: $table.holdAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastUpdated => $composableBuilder(
      column: $table.lastUpdated, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnWithTypeConverterFilters<SyncStatus, SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus,
          builder: (column) => ColumnWithTypeConverterFilters(column));

  ColumnFilters<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get walletId => $composableBuilder(
      column: $table.walletId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get balanceType => $composableBuilder(
      column: $table.balanceType, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isPrimary => $composableBuilder(
      column: $table.isPrimary, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get interestRate => $composableBuilder(
      column: $table.interestRate, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get creditLimit => $composableBuilder(
      column: $table.creditLimit, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get minimumBalance => $composableBuilder(
      column: $table.minimumBalance,
      builder: (column) => ColumnFilters(column));
}

class $$BalancesTableTableOrderingComposer
    extends Composer<_$AppDatabase, $BalancesTableTable> {
  $$BalancesTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get accountId => $composableBuilder(
      column: $table.accountId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currencyCode => $composableBuilder(
      column: $table.currencyCode,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get availableAmount => $composableBuilder(
      column: $table.availableAmount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get pendingAmount => $composableBuilder(
      column: $table.pendingAmount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get holdAmount => $composableBuilder(
      column: $table.holdAmount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastUpdated => $composableBuilder(
      column: $table.lastUpdated, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get walletId => $composableBuilder(
      column: $table.walletId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get balanceType => $composableBuilder(
      column: $table.balanceType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isPrimary => $composableBuilder(
      column: $table.isPrimary, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get interestRate => $composableBuilder(
      column: $table.interestRate,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get creditLimit => $composableBuilder(
      column: $table.creditLimit, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get minimumBalance => $composableBuilder(
      column: $table.minimumBalance,
      builder: (column) => ColumnOrderings(column));
}

class $$BalancesTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $BalancesTableTable> {
  $$BalancesTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => column);

  GeneratedColumn<String> get accountId =>
      $composableBuilder(column: $table.accountId, builder: (column) => column);

  GeneratedColumn<String> get currencyCode => $composableBuilder(
      column: $table.currencyCode, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<double> get availableAmount => $composableBuilder(
      column: $table.availableAmount, builder: (column) => column);

  GeneratedColumn<double> get pendingAmount => $composableBuilder(
      column: $table.pendingAmount, builder: (column) => column);

  GeneratedColumn<double> get holdAmount => $composableBuilder(
      column: $table.holdAmount, builder: (column) => column);

  GeneratedColumn<int> get lastUpdated => $composableBuilder(
      column: $table.lastUpdated, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumnWithTypeConverter<SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp, builder: (column) => column);

  GeneratedColumn<String> get walletId =>
      $composableBuilder(column: $table.walletId, builder: (column) => column);

  GeneratedColumn<String> get balanceType => $composableBuilder(
      column: $table.balanceType, builder: (column) => column);

  GeneratedColumn<bool> get isPrimary =>
      $composableBuilder(column: $table.isPrimary, builder: (column) => column);

  GeneratedColumn<String> get metadata =>
      $composableBuilder(column: $table.metadata, builder: (column) => column);

  GeneratedColumn<double> get interestRate => $composableBuilder(
      column: $table.interestRate, builder: (column) => column);

  GeneratedColumn<double> get creditLimit => $composableBuilder(
      column: $table.creditLimit, builder: (column) => column);

  GeneratedColumn<double> get minimumBalance => $composableBuilder(
      column: $table.minimumBalance, builder: (column) => column);
}

class $$BalancesTableTableTableManager extends RootTableManager<
    _$AppDatabase,
    $BalancesTableTable,
    BalanceEntity,
    $$BalancesTableTableFilterComposer,
    $$BalancesTableTableOrderingComposer,
    $$BalancesTableTableAnnotationComposer,
    $$BalancesTableTableCreateCompanionBuilder,
    $$BalancesTableTableUpdateCompanionBuilder,
    (
      BalanceEntity,
      BaseReferences<_$AppDatabase, $BalancesTableTable, BalanceEntity>
    ),
    BalanceEntity,
    PrefetchHooks Function()> {
  $$BalancesTableTableTableManager(_$AppDatabase db, $BalancesTableTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$BalancesTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$BalancesTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$BalancesTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> userId = const Value.absent(),
            Value<String> accountId = const Value.absent(),
            Value<String> currencyCode = const Value.absent(),
            Value<double> amount = const Value.absent(),
            Value<double> availableAmount = const Value.absent(),
            Value<double> pendingAmount = const Value.absent(),
            Value<double> holdAmount = const Value.absent(),
            Value<int> lastUpdated = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<String?> walletId = const Value.absent(),
            Value<String> balanceType = const Value.absent(),
            Value<bool> isPrimary = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<double?> interestRate = const Value.absent(),
            Value<double?> creditLimit = const Value.absent(),
            Value<double> minimumBalance = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              BalancesTableCompanion(
            userId: userId,
            accountId: accountId,
            currencyCode: currencyCode,
            amount: amount,
            availableAmount: availableAmount,
            pendingAmount: pendingAmount,
            holdAmount: holdAmount,
            lastUpdated: lastUpdated,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncStatus: syncStatus,
            serverTimestamp: serverTimestamp,
            walletId: walletId,
            balanceType: balanceType,
            isPrimary: isPrimary,
            metadata: metadata,
            interestRate: interestRate,
            creditLimit: creditLimit,
            minimumBalance: minimumBalance,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String userId,
            required String accountId,
            required String currencyCode,
            Value<double> amount = const Value.absent(),
            Value<double> availableAmount = const Value.absent(),
            Value<double> pendingAmount = const Value.absent(),
            Value<double> holdAmount = const Value.absent(),
            Value<int> lastUpdated = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<String?> walletId = const Value.absent(),
            Value<String> balanceType = const Value.absent(),
            Value<bool> isPrimary = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<double?> interestRate = const Value.absent(),
            Value<double?> creditLimit = const Value.absent(),
            Value<double> minimumBalance = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              BalancesTableCompanion.insert(
            userId: userId,
            accountId: accountId,
            currencyCode: currencyCode,
            amount: amount,
            availableAmount: availableAmount,
            pendingAmount: pendingAmount,
            holdAmount: holdAmount,
            lastUpdated: lastUpdated,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncStatus: syncStatus,
            serverTimestamp: serverTimestamp,
            walletId: walletId,
            balanceType: balanceType,
            isPrimary: isPrimary,
            metadata: metadata,
            interestRate: interestRate,
            creditLimit: creditLimit,
            minimumBalance: minimumBalance,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$BalancesTableTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $BalancesTableTable,
    BalanceEntity,
    $$BalancesTableTableFilterComposer,
    $$BalancesTableTableOrderingComposer,
    $$BalancesTableTableAnnotationComposer,
    $$BalancesTableTableCreateCompanionBuilder,
    $$BalancesTableTableUpdateCompanionBuilder,
    (
      BalanceEntity,
      BaseReferences<_$AppDatabase, $BalancesTableTable, BalanceEntity>
    ),
    BalanceEntity,
    PrefetchHooks Function()>;
typedef $$MessagesTableTableCreateCompanionBuilder = MessagesTableCompanion
    Function({
  required String id,
  required String interactionId,
  required String senderEntityId,
  required String content,
  Value<String> type,
  Value<String> status,
  required int timestamp,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<SyncStatus> syncStatus,
  Value<String?> localId,
  Value<int?> serverTimestamp,
  Value<bool> isOptimistic,
  Value<String?> replyToMessageId,
  Value<String?> transactionId,
  Value<String?> metadata,
  Value<int?> editedAt,
  Value<bool> isEdited,
  Value<bool> isDeleted,
  Value<int?> deletedAt,
  Value<int?> deliveredAt,
  Value<int?> readAt,
  Value<String?> reactions,
  Value<String> priority,
  Value<String?> encryptionKeyId,
  Value<int?> sequenceNumber,
  Value<int> rowid,
});
typedef $$MessagesTableTableUpdateCompanionBuilder = MessagesTableCompanion
    Function({
  Value<String> id,
  Value<String> interactionId,
  Value<String> senderEntityId,
  Value<String> content,
  Value<String> type,
  Value<String> status,
  Value<int> timestamp,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<SyncStatus> syncStatus,
  Value<String?> localId,
  Value<int?> serverTimestamp,
  Value<bool> isOptimistic,
  Value<String?> replyToMessageId,
  Value<String?> transactionId,
  Value<String?> metadata,
  Value<int?> editedAt,
  Value<bool> isEdited,
  Value<bool> isDeleted,
  Value<int?> deletedAt,
  Value<int?> deliveredAt,
  Value<int?> readAt,
  Value<String?> reactions,
  Value<String> priority,
  Value<String?> encryptionKeyId,
  Value<int?> sequenceNumber,
  Value<int> rowid,
});

class $$MessagesTableTableFilterComposer
    extends Composer<_$AppDatabase, $MessagesTableTable> {
  $$MessagesTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get interactionId => $composableBuilder(
      column: $table.interactionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get senderEntityId => $composableBuilder(
      column: $table.senderEntityId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get content => $composableBuilder(
      column: $table.content, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnWithTypeConverterFilters<SyncStatus, SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus,
          builder: (column) => ColumnWithTypeConverterFilters(column));

  ColumnFilters<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isOptimistic => $composableBuilder(
      column: $table.isOptimistic, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get replyToMessageId => $composableBuilder(
      column: $table.replyToMessageId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get transactionId => $composableBuilder(
      column: $table.transactionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get editedAt => $composableBuilder(
      column: $table.editedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isEdited => $composableBuilder(
      column: $table.isEdited, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get deletedAt => $composableBuilder(
      column: $table.deletedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get deliveredAt => $composableBuilder(
      column: $table.deliveredAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get readAt => $composableBuilder(
      column: $table.readAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get reactions => $composableBuilder(
      column: $table.reactions, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get encryptionKeyId => $composableBuilder(
      column: $table.encryptionKeyId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get sequenceNumber => $composableBuilder(
      column: $table.sequenceNumber,
      builder: (column) => ColumnFilters(column));
}

class $$MessagesTableTableOrderingComposer
    extends Composer<_$AppDatabase, $MessagesTableTable> {
  $$MessagesTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get interactionId => $composableBuilder(
      column: $table.interactionId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get senderEntityId => $composableBuilder(
      column: $table.senderEntityId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get content => $composableBuilder(
      column: $table.content, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isOptimistic => $composableBuilder(
      column: $table.isOptimistic,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get replyToMessageId => $composableBuilder(
      column: $table.replyToMessageId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get transactionId => $composableBuilder(
      column: $table.transactionId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get editedAt => $composableBuilder(
      column: $table.editedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isEdited => $composableBuilder(
      column: $table.isEdited, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get deletedAt => $composableBuilder(
      column: $table.deletedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get deliveredAt => $composableBuilder(
      column: $table.deliveredAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get readAt => $composableBuilder(
      column: $table.readAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get reactions => $composableBuilder(
      column: $table.reactions, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get encryptionKeyId => $composableBuilder(
      column: $table.encryptionKeyId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get sequenceNumber => $composableBuilder(
      column: $table.sequenceNumber,
      builder: (column) => ColumnOrderings(column));
}

class $$MessagesTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $MessagesTableTable> {
  $$MessagesTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get interactionId => $composableBuilder(
      column: $table.interactionId, builder: (column) => column);

  GeneratedColumn<String> get senderEntityId => $composableBuilder(
      column: $table.senderEntityId, builder: (column) => column);

  GeneratedColumn<String> get content =>
      $composableBuilder(column: $table.content, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get timestamp =>
      $composableBuilder(column: $table.timestamp, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumnWithTypeConverter<SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get localId =>
      $composableBuilder(column: $table.localId, builder: (column) => column);

  GeneratedColumn<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp, builder: (column) => column);

  GeneratedColumn<bool> get isOptimistic => $composableBuilder(
      column: $table.isOptimistic, builder: (column) => column);

  GeneratedColumn<String> get replyToMessageId => $composableBuilder(
      column: $table.replyToMessageId, builder: (column) => column);

  GeneratedColumn<String> get transactionId => $composableBuilder(
      column: $table.transactionId, builder: (column) => column);

  GeneratedColumn<String> get metadata =>
      $composableBuilder(column: $table.metadata, builder: (column) => column);

  GeneratedColumn<int> get editedAt =>
      $composableBuilder(column: $table.editedAt, builder: (column) => column);

  GeneratedColumn<bool> get isEdited =>
      $composableBuilder(column: $table.isEdited, builder: (column) => column);

  GeneratedColumn<bool> get isDeleted =>
      $composableBuilder(column: $table.isDeleted, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<int> get deliveredAt => $composableBuilder(
      column: $table.deliveredAt, builder: (column) => column);

  GeneratedColumn<int> get readAt =>
      $composableBuilder(column: $table.readAt, builder: (column) => column);

  GeneratedColumn<String> get reactions =>
      $composableBuilder(column: $table.reactions, builder: (column) => column);

  GeneratedColumn<String> get priority =>
      $composableBuilder(column: $table.priority, builder: (column) => column);

  GeneratedColumn<String> get encryptionKeyId => $composableBuilder(
      column: $table.encryptionKeyId, builder: (column) => column);

  GeneratedColumn<int> get sequenceNumber => $composableBuilder(
      column: $table.sequenceNumber, builder: (column) => column);
}

class $$MessagesTableTableTableManager extends RootTableManager<
    _$AppDatabase,
    $MessagesTableTable,
    MessageEntity,
    $$MessagesTableTableFilterComposer,
    $$MessagesTableTableOrderingComposer,
    $$MessagesTableTableAnnotationComposer,
    $$MessagesTableTableCreateCompanionBuilder,
    $$MessagesTableTableUpdateCompanionBuilder,
    (
      MessageEntity,
      BaseReferences<_$AppDatabase, $MessagesTableTable, MessageEntity>
    ),
    MessageEntity,
    PrefetchHooks Function()> {
  $$MessagesTableTableTableManager(_$AppDatabase db, $MessagesTableTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MessagesTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MessagesTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MessagesTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> interactionId = const Value.absent(),
            Value<String> senderEntityId = const Value.absent(),
            Value<String> content = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> timestamp = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<String?> localId = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<bool> isOptimistic = const Value.absent(),
            Value<String?> replyToMessageId = const Value.absent(),
            Value<String?> transactionId = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<int?> editedAt = const Value.absent(),
            Value<bool> isEdited = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
            Value<int?> deletedAt = const Value.absent(),
            Value<int?> deliveredAt = const Value.absent(),
            Value<int?> readAt = const Value.absent(),
            Value<String?> reactions = const Value.absent(),
            Value<String> priority = const Value.absent(),
            Value<String?> encryptionKeyId = const Value.absent(),
            Value<int?> sequenceNumber = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              MessagesTableCompanion(
            id: id,
            interactionId: interactionId,
            senderEntityId: senderEntityId,
            content: content,
            type: type,
            status: status,
            timestamp: timestamp,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncStatus: syncStatus,
            localId: localId,
            serverTimestamp: serverTimestamp,
            isOptimistic: isOptimistic,
            replyToMessageId: replyToMessageId,
            transactionId: transactionId,
            metadata: metadata,
            editedAt: editedAt,
            isEdited: isEdited,
            isDeleted: isDeleted,
            deletedAt: deletedAt,
            deliveredAt: deliveredAt,
            readAt: readAt,
            reactions: reactions,
            priority: priority,
            encryptionKeyId: encryptionKeyId,
            sequenceNumber: sequenceNumber,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String interactionId,
            required String senderEntityId,
            required String content,
            Value<String> type = const Value.absent(),
            Value<String> status = const Value.absent(),
            required int timestamp,
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<String?> localId = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<bool> isOptimistic = const Value.absent(),
            Value<String?> replyToMessageId = const Value.absent(),
            Value<String?> transactionId = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<int?> editedAt = const Value.absent(),
            Value<bool> isEdited = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
            Value<int?> deletedAt = const Value.absent(),
            Value<int?> deliveredAt = const Value.absent(),
            Value<int?> readAt = const Value.absent(),
            Value<String?> reactions = const Value.absent(),
            Value<String> priority = const Value.absent(),
            Value<String?> encryptionKeyId = const Value.absent(),
            Value<int?> sequenceNumber = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              MessagesTableCompanion.insert(
            id: id,
            interactionId: interactionId,
            senderEntityId: senderEntityId,
            content: content,
            type: type,
            status: status,
            timestamp: timestamp,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncStatus: syncStatus,
            localId: localId,
            serverTimestamp: serverTimestamp,
            isOptimistic: isOptimistic,
            replyToMessageId: replyToMessageId,
            transactionId: transactionId,
            metadata: metadata,
            editedAt: editedAt,
            isEdited: isEdited,
            isDeleted: isDeleted,
            deletedAt: deletedAt,
            deliveredAt: deliveredAt,
            readAt: readAt,
            reactions: reactions,
            priority: priority,
            encryptionKeyId: encryptionKeyId,
            sequenceNumber: sequenceNumber,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$MessagesTableTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $MessagesTableTable,
    MessageEntity,
    $$MessagesTableTableFilterComposer,
    $$MessagesTableTableOrderingComposer,
    $$MessagesTableTableAnnotationComposer,
    $$MessagesTableTableCreateCompanionBuilder,
    $$MessagesTableTableUpdateCompanionBuilder,
    (
      MessageEntity,
      BaseReferences<_$AppDatabase, $MessagesTableTable, MessageEntity>
    ),
    MessageEntity,
    PrefetchHooks Function()>;
typedef $$InteractionsTableTableCreateCompanionBuilder
    = InteractionsTableCompanion Function({
  required String id,
  Value<String> type,
  Value<String> status,
  Value<String?> title,
  Value<String?> description,
  required String participantIds,
  required String createdBy,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<int?> lastMessageAt,
  Value<String?> lastMessageId,
  Value<String?> lastMessagePreview,
  Value<String?> lastMessageSenderId,
  Value<SyncStatus> syncStatus,
  Value<String?> localId,
  Value<int?> serverTimestamp,
  Value<bool> isOptimistic,
  Value<int> unreadCount,
  Value<bool> isPinned,
  Value<bool> isMuted,
  Value<bool> isArchived,
  Value<String?> metadata,
  Value<String?> avatarUrl,
  Value<String?> colorTheme,
  Value<String?> notificationSettings,
  Value<String?> tags,
  Value<int?> lastAccessedAt,
  Value<String?> encryptionSettings,
  Value<bool> allowNewMembers,
  Value<int?> maxParticipants,
  Value<int> rowid,
});
typedef $$InteractionsTableTableUpdateCompanionBuilder
    = InteractionsTableCompanion Function({
  Value<String> id,
  Value<String> type,
  Value<String> status,
  Value<String?> title,
  Value<String?> description,
  Value<String> participantIds,
  Value<String> createdBy,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<int?> lastMessageAt,
  Value<String?> lastMessageId,
  Value<String?> lastMessagePreview,
  Value<String?> lastMessageSenderId,
  Value<SyncStatus> syncStatus,
  Value<String?> localId,
  Value<int?> serverTimestamp,
  Value<bool> isOptimistic,
  Value<int> unreadCount,
  Value<bool> isPinned,
  Value<bool> isMuted,
  Value<bool> isArchived,
  Value<String?> metadata,
  Value<String?> avatarUrl,
  Value<String?> colorTheme,
  Value<String?> notificationSettings,
  Value<String?> tags,
  Value<int?> lastAccessedAt,
  Value<String?> encryptionSettings,
  Value<bool> allowNewMembers,
  Value<int?> maxParticipants,
  Value<int> rowid,
});

class $$InteractionsTableTableFilterComposer
    extends Composer<_$AppDatabase, $InteractionsTableTable> {
  $$InteractionsTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get title => $composableBuilder(
      column: $table.title, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get participantIds => $composableBuilder(
      column: $table.participantIds,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdBy => $composableBuilder(
      column: $table.createdBy, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastMessageAt => $composableBuilder(
      column: $table.lastMessageAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastMessageId => $composableBuilder(
      column: $table.lastMessageId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastMessagePreview => $composableBuilder(
      column: $table.lastMessagePreview,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastMessageSenderId => $composableBuilder(
      column: $table.lastMessageSenderId,
      builder: (column) => ColumnFilters(column));

  ColumnWithTypeConverterFilters<SyncStatus, SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus,
          builder: (column) => ColumnWithTypeConverterFilters(column));

  ColumnFilters<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isOptimistic => $composableBuilder(
      column: $table.isOptimistic, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get unreadCount => $composableBuilder(
      column: $table.unreadCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isPinned => $composableBuilder(
      column: $table.isPinned, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isMuted => $composableBuilder(
      column: $table.isMuted, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isArchived => $composableBuilder(
      column: $table.isArchived, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get colorTheme => $composableBuilder(
      column: $table.colorTheme, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get notificationSettings => $composableBuilder(
      column: $table.notificationSettings,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tags => $composableBuilder(
      column: $table.tags, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get encryptionSettings => $composableBuilder(
      column: $table.encryptionSettings,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get allowNewMembers => $composableBuilder(
      column: $table.allowNewMembers,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get maxParticipants => $composableBuilder(
      column: $table.maxParticipants,
      builder: (column) => ColumnFilters(column));
}

class $$InteractionsTableTableOrderingComposer
    extends Composer<_$AppDatabase, $InteractionsTableTable> {
  $$InteractionsTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get title => $composableBuilder(
      column: $table.title, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get participantIds => $composableBuilder(
      column: $table.participantIds,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdBy => $composableBuilder(
      column: $table.createdBy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastMessageAt => $composableBuilder(
      column: $table.lastMessageAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastMessageId => $composableBuilder(
      column: $table.lastMessageId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastMessagePreview => $composableBuilder(
      column: $table.lastMessagePreview,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastMessageSenderId => $composableBuilder(
      column: $table.lastMessageSenderId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isOptimistic => $composableBuilder(
      column: $table.isOptimistic,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get unreadCount => $composableBuilder(
      column: $table.unreadCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isPinned => $composableBuilder(
      column: $table.isPinned, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isMuted => $composableBuilder(
      column: $table.isMuted, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isArchived => $composableBuilder(
      column: $table.isArchived, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get colorTheme => $composableBuilder(
      column: $table.colorTheme, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get notificationSettings => $composableBuilder(
      column: $table.notificationSettings,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tags => $composableBuilder(
      column: $table.tags, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get encryptionSettings => $composableBuilder(
      column: $table.encryptionSettings,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get allowNewMembers => $composableBuilder(
      column: $table.allowNewMembers,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get maxParticipants => $composableBuilder(
      column: $table.maxParticipants,
      builder: (column) => ColumnOrderings(column));
}

class $$InteractionsTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $InteractionsTableTable> {
  $$InteractionsTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => column);

  GeneratedColumn<String> get participantIds => $composableBuilder(
      column: $table.participantIds, builder: (column) => column);

  GeneratedColumn<String> get createdBy =>
      $composableBuilder(column: $table.createdBy, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get lastMessageAt => $composableBuilder(
      column: $table.lastMessageAt, builder: (column) => column);

  GeneratedColumn<String> get lastMessageId => $composableBuilder(
      column: $table.lastMessageId, builder: (column) => column);

  GeneratedColumn<String> get lastMessagePreview => $composableBuilder(
      column: $table.lastMessagePreview, builder: (column) => column);

  GeneratedColumn<String> get lastMessageSenderId => $composableBuilder(
      column: $table.lastMessageSenderId, builder: (column) => column);

  GeneratedColumnWithTypeConverter<SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get localId =>
      $composableBuilder(column: $table.localId, builder: (column) => column);

  GeneratedColumn<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp, builder: (column) => column);

  GeneratedColumn<bool> get isOptimistic => $composableBuilder(
      column: $table.isOptimistic, builder: (column) => column);

  GeneratedColumn<int> get unreadCount => $composableBuilder(
      column: $table.unreadCount, builder: (column) => column);

  GeneratedColumn<bool> get isPinned =>
      $composableBuilder(column: $table.isPinned, builder: (column) => column);

  GeneratedColumn<bool> get isMuted =>
      $composableBuilder(column: $table.isMuted, builder: (column) => column);

  GeneratedColumn<bool> get isArchived => $composableBuilder(
      column: $table.isArchived, builder: (column) => column);

  GeneratedColumn<String> get metadata =>
      $composableBuilder(column: $table.metadata, builder: (column) => column);

  GeneratedColumn<String> get avatarUrl =>
      $composableBuilder(column: $table.avatarUrl, builder: (column) => column);

  GeneratedColumn<String> get colorTheme => $composableBuilder(
      column: $table.colorTheme, builder: (column) => column);

  GeneratedColumn<String> get notificationSettings => $composableBuilder(
      column: $table.notificationSettings, builder: (column) => column);

  GeneratedColumn<String> get tags =>
      $composableBuilder(column: $table.tags, builder: (column) => column);

  GeneratedColumn<int> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt, builder: (column) => column);

  GeneratedColumn<String> get encryptionSettings => $composableBuilder(
      column: $table.encryptionSettings, builder: (column) => column);

  GeneratedColumn<bool> get allowNewMembers => $composableBuilder(
      column: $table.allowNewMembers, builder: (column) => column);

  GeneratedColumn<int> get maxParticipants => $composableBuilder(
      column: $table.maxParticipants, builder: (column) => column);
}

class $$InteractionsTableTableTableManager extends RootTableManager<
    _$AppDatabase,
    $InteractionsTableTable,
    InteractionEntity,
    $$InteractionsTableTableFilterComposer,
    $$InteractionsTableTableOrderingComposer,
    $$InteractionsTableTableAnnotationComposer,
    $$InteractionsTableTableCreateCompanionBuilder,
    $$InteractionsTableTableUpdateCompanionBuilder,
    (
      InteractionEntity,
      BaseReferences<_$AppDatabase, $InteractionsTableTable, InteractionEntity>
    ),
    InteractionEntity,
    PrefetchHooks Function()> {
  $$InteractionsTableTableTableManager(
      _$AppDatabase db, $InteractionsTableTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$InteractionsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$InteractionsTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$InteractionsTableTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String?> title = const Value.absent(),
            Value<String?> description = const Value.absent(),
            Value<String> participantIds = const Value.absent(),
            Value<String> createdBy = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<int?> lastMessageAt = const Value.absent(),
            Value<String?> lastMessageId = const Value.absent(),
            Value<String?> lastMessagePreview = const Value.absent(),
            Value<String?> lastMessageSenderId = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<String?> localId = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<bool> isOptimistic = const Value.absent(),
            Value<int> unreadCount = const Value.absent(),
            Value<bool> isPinned = const Value.absent(),
            Value<bool> isMuted = const Value.absent(),
            Value<bool> isArchived = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<String?> colorTheme = const Value.absent(),
            Value<String?> notificationSettings = const Value.absent(),
            Value<String?> tags = const Value.absent(),
            Value<int?> lastAccessedAt = const Value.absent(),
            Value<String?> encryptionSettings = const Value.absent(),
            Value<bool> allowNewMembers = const Value.absent(),
            Value<int?> maxParticipants = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              InteractionsTableCompanion(
            id: id,
            type: type,
            status: status,
            title: title,
            description: description,
            participantIds: participantIds,
            createdBy: createdBy,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastMessageAt: lastMessageAt,
            lastMessageId: lastMessageId,
            lastMessagePreview: lastMessagePreview,
            lastMessageSenderId: lastMessageSenderId,
            syncStatus: syncStatus,
            localId: localId,
            serverTimestamp: serverTimestamp,
            isOptimistic: isOptimistic,
            unreadCount: unreadCount,
            isPinned: isPinned,
            isMuted: isMuted,
            isArchived: isArchived,
            metadata: metadata,
            avatarUrl: avatarUrl,
            colorTheme: colorTheme,
            notificationSettings: notificationSettings,
            tags: tags,
            lastAccessedAt: lastAccessedAt,
            encryptionSettings: encryptionSettings,
            allowNewMembers: allowNewMembers,
            maxParticipants: maxParticipants,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String> type = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String?> title = const Value.absent(),
            Value<String?> description = const Value.absent(),
            required String participantIds,
            required String createdBy,
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<int?> lastMessageAt = const Value.absent(),
            Value<String?> lastMessageId = const Value.absent(),
            Value<String?> lastMessagePreview = const Value.absent(),
            Value<String?> lastMessageSenderId = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<String?> localId = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<bool> isOptimistic = const Value.absent(),
            Value<int> unreadCount = const Value.absent(),
            Value<bool> isPinned = const Value.absent(),
            Value<bool> isMuted = const Value.absent(),
            Value<bool> isArchived = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<String?> colorTheme = const Value.absent(),
            Value<String?> notificationSettings = const Value.absent(),
            Value<String?> tags = const Value.absent(),
            Value<int?> lastAccessedAt = const Value.absent(),
            Value<String?> encryptionSettings = const Value.absent(),
            Value<bool> allowNewMembers = const Value.absent(),
            Value<int?> maxParticipants = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              InteractionsTableCompanion.insert(
            id: id,
            type: type,
            status: status,
            title: title,
            description: description,
            participantIds: participantIds,
            createdBy: createdBy,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastMessageAt: lastMessageAt,
            lastMessageId: lastMessageId,
            lastMessagePreview: lastMessagePreview,
            lastMessageSenderId: lastMessageSenderId,
            syncStatus: syncStatus,
            localId: localId,
            serverTimestamp: serverTimestamp,
            isOptimistic: isOptimistic,
            unreadCount: unreadCount,
            isPinned: isPinned,
            isMuted: isMuted,
            isArchived: isArchived,
            metadata: metadata,
            avatarUrl: avatarUrl,
            colorTheme: colorTheme,
            notificationSettings: notificationSettings,
            tags: tags,
            lastAccessedAt: lastAccessedAt,
            encryptionSettings: encryptionSettings,
            allowNewMembers: allowNewMembers,
            maxParticipants: maxParticipants,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$InteractionsTableTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $InteractionsTableTable,
    InteractionEntity,
    $$InteractionsTableTableFilterComposer,
    $$InteractionsTableTableOrderingComposer,
    $$InteractionsTableTableAnnotationComposer,
    $$InteractionsTableTableCreateCompanionBuilder,
    $$InteractionsTableTableUpdateCompanionBuilder,
    (
      InteractionEntity,
      BaseReferences<_$AppDatabase, $InteractionsTableTable, InteractionEntity>
    ),
    InteractionEntity,
    PrefetchHooks Function()>;
typedef $$UsersTableTableCreateCompanionBuilder = UsersTableCompanion Function({
  required String id,
  Value<String?> email,
  Value<String?> phoneNumber,
  Value<String?> displayName,
  Value<String?> firstName,
  Value<String?> lastName,
  Value<String?> username,
  Value<String?> avatarUrl,
  Value<String?> bio,
  Value<String?> dateOfBirth,
  Value<String?> countryCode,
  Value<String> language,
  Value<String?> timezone,
  Value<String> preferredCurrency,
  Value<String> status,
  Value<String> accountType,
  Value<String> kycStatus,
  Value<int> kycLevel,
  Value<bool> biometricEnabled,
  Value<bool> twoFactorEnabled,
  Value<String?> notificationPreferences,
  Value<String?> privacySettings,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<int?> lastSeenAt,
  Value<bool> isOnline,
  Value<SyncStatus> syncStatus,
  Value<int?> serverTimestamp,
  Value<String?> address,
  Value<String?> socialLinks,
  Value<String?> emergencyContact,
  Value<String?> employmentInfo,
  Value<String?> metadata,
  Value<String?> referralCode,
  Value<String?> referredBy,
  Value<int> referralCount,
  Value<double?> trustScore,
  Value<bool> isVerified,
  Value<bool> isBusiness,
  Value<String?> businessInfo,
  Value<int> rowid,
});
typedef $$UsersTableTableUpdateCompanionBuilder = UsersTableCompanion Function({
  Value<String> id,
  Value<String?> email,
  Value<String?> phoneNumber,
  Value<String?> displayName,
  Value<String?> firstName,
  Value<String?> lastName,
  Value<String?> username,
  Value<String?> avatarUrl,
  Value<String?> bio,
  Value<String?> dateOfBirth,
  Value<String?> countryCode,
  Value<String> language,
  Value<String?> timezone,
  Value<String> preferredCurrency,
  Value<String> status,
  Value<String> accountType,
  Value<String> kycStatus,
  Value<int> kycLevel,
  Value<bool> biometricEnabled,
  Value<bool> twoFactorEnabled,
  Value<String?> notificationPreferences,
  Value<String?> privacySettings,
  Value<int> createdAt,
  Value<int> updatedAt,
  Value<int?> lastSeenAt,
  Value<bool> isOnline,
  Value<SyncStatus> syncStatus,
  Value<int?> serverTimestamp,
  Value<String?> address,
  Value<String?> socialLinks,
  Value<String?> emergencyContact,
  Value<String?> employmentInfo,
  Value<String?> metadata,
  Value<String?> referralCode,
  Value<String?> referredBy,
  Value<int> referralCount,
  Value<double?> trustScore,
  Value<bool> isVerified,
  Value<bool> isBusiness,
  Value<String?> businessInfo,
  Value<int> rowid,
});

class $$UsersTableTableFilterComposer
    extends Composer<_$AppDatabase, $UsersTableTable> {
  $$UsersTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get email => $composableBuilder(
      column: $table.email, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get phoneNumber => $composableBuilder(
      column: $table.phoneNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get firstName => $composableBuilder(
      column: $table.firstName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastName => $composableBuilder(
      column: $table.lastName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get username => $composableBuilder(
      column: $table.username, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get bio => $composableBuilder(
      column: $table.bio, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get dateOfBirth => $composableBuilder(
      column: $table.dateOfBirth, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get countryCode => $composableBuilder(
      column: $table.countryCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get language => $composableBuilder(
      column: $table.language, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get timezone => $composableBuilder(
      column: $table.timezone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get preferredCurrency => $composableBuilder(
      column: $table.preferredCurrency,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get accountType => $composableBuilder(
      column: $table.accountType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kycStatus => $composableBuilder(
      column: $table.kycStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get kycLevel => $composableBuilder(
      column: $table.kycLevel, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get biometricEnabled => $composableBuilder(
      column: $table.biometricEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get twoFactorEnabled => $composableBuilder(
      column: $table.twoFactorEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get notificationPreferences => $composableBuilder(
      column: $table.notificationPreferences,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get privacySettings => $composableBuilder(
      column: $table.privacySettings,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastSeenAt => $composableBuilder(
      column: $table.lastSeenAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isOnline => $composableBuilder(
      column: $table.isOnline, builder: (column) => ColumnFilters(column));

  ColumnWithTypeConverterFilters<SyncStatus, SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus,
          builder: (column) => ColumnWithTypeConverterFilters(column));

  ColumnFilters<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get socialLinks => $composableBuilder(
      column: $table.socialLinks, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get emergencyContact => $composableBuilder(
      column: $table.emergencyContact,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get employmentInfo => $composableBuilder(
      column: $table.employmentInfo,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get referralCode => $composableBuilder(
      column: $table.referralCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get referredBy => $composableBuilder(
      column: $table.referredBy, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get referralCount => $composableBuilder(
      column: $table.referralCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get trustScore => $composableBuilder(
      column: $table.trustScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isVerified => $composableBuilder(
      column: $table.isVerified, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isBusiness => $composableBuilder(
      column: $table.isBusiness, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get businessInfo => $composableBuilder(
      column: $table.businessInfo, builder: (column) => ColumnFilters(column));
}

class $$UsersTableTableOrderingComposer
    extends Composer<_$AppDatabase, $UsersTableTable> {
  $$UsersTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get email => $composableBuilder(
      column: $table.email, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get phoneNumber => $composableBuilder(
      column: $table.phoneNumber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get firstName => $composableBuilder(
      column: $table.firstName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastName => $composableBuilder(
      column: $table.lastName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get username => $composableBuilder(
      column: $table.username, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get bio => $composableBuilder(
      column: $table.bio, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get dateOfBirth => $composableBuilder(
      column: $table.dateOfBirth, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get countryCode => $composableBuilder(
      column: $table.countryCode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get language => $composableBuilder(
      column: $table.language, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get timezone => $composableBuilder(
      column: $table.timezone, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get preferredCurrency => $composableBuilder(
      column: $table.preferredCurrency,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get accountType => $composableBuilder(
      column: $table.accountType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kycStatus => $composableBuilder(
      column: $table.kycStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get kycLevel => $composableBuilder(
      column: $table.kycLevel, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get biometricEnabled => $composableBuilder(
      column: $table.biometricEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get twoFactorEnabled => $composableBuilder(
      column: $table.twoFactorEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get notificationPreferences => $composableBuilder(
      column: $table.notificationPreferences,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get privacySettings => $composableBuilder(
      column: $table.privacySettings,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastSeenAt => $composableBuilder(
      column: $table.lastSeenAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isOnline => $composableBuilder(
      column: $table.isOnline, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get socialLinks => $composableBuilder(
      column: $table.socialLinks, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get emergencyContact => $composableBuilder(
      column: $table.emergencyContact,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get employmentInfo => $composableBuilder(
      column: $table.employmentInfo,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get referralCode => $composableBuilder(
      column: $table.referralCode,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get referredBy => $composableBuilder(
      column: $table.referredBy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get referralCount => $composableBuilder(
      column: $table.referralCount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get trustScore => $composableBuilder(
      column: $table.trustScore, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isVerified => $composableBuilder(
      column: $table.isVerified, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isBusiness => $composableBuilder(
      column: $table.isBusiness, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get businessInfo => $composableBuilder(
      column: $table.businessInfo,
      builder: (column) => ColumnOrderings(column));
}

class $$UsersTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $UsersTableTable> {
  $$UsersTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get email =>
      $composableBuilder(column: $table.email, builder: (column) => column);

  GeneratedColumn<String> get phoneNumber => $composableBuilder(
      column: $table.phoneNumber, builder: (column) => column);

  GeneratedColumn<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => column);

  GeneratedColumn<String> get firstName =>
      $composableBuilder(column: $table.firstName, builder: (column) => column);

  GeneratedColumn<String> get lastName =>
      $composableBuilder(column: $table.lastName, builder: (column) => column);

  GeneratedColumn<String> get username =>
      $composableBuilder(column: $table.username, builder: (column) => column);

  GeneratedColumn<String> get avatarUrl =>
      $composableBuilder(column: $table.avatarUrl, builder: (column) => column);

  GeneratedColumn<String> get bio =>
      $composableBuilder(column: $table.bio, builder: (column) => column);

  GeneratedColumn<String> get dateOfBirth => $composableBuilder(
      column: $table.dateOfBirth, builder: (column) => column);

  GeneratedColumn<String> get countryCode => $composableBuilder(
      column: $table.countryCode, builder: (column) => column);

  GeneratedColumn<String> get language =>
      $composableBuilder(column: $table.language, builder: (column) => column);

  GeneratedColumn<String> get timezone =>
      $composableBuilder(column: $table.timezone, builder: (column) => column);

  GeneratedColumn<String> get preferredCurrency => $composableBuilder(
      column: $table.preferredCurrency, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get accountType => $composableBuilder(
      column: $table.accountType, builder: (column) => column);

  GeneratedColumn<String> get kycStatus =>
      $composableBuilder(column: $table.kycStatus, builder: (column) => column);

  GeneratedColumn<int> get kycLevel =>
      $composableBuilder(column: $table.kycLevel, builder: (column) => column);

  GeneratedColumn<bool> get biometricEnabled => $composableBuilder(
      column: $table.biometricEnabled, builder: (column) => column);

  GeneratedColumn<bool> get twoFactorEnabled => $composableBuilder(
      column: $table.twoFactorEnabled, builder: (column) => column);

  GeneratedColumn<String> get notificationPreferences => $composableBuilder(
      column: $table.notificationPreferences, builder: (column) => column);

  GeneratedColumn<String> get privacySettings => $composableBuilder(
      column: $table.privacySettings, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get lastSeenAt => $composableBuilder(
      column: $table.lastSeenAt, builder: (column) => column);

  GeneratedColumn<bool> get isOnline =>
      $composableBuilder(column: $table.isOnline, builder: (column) => column);

  GeneratedColumnWithTypeConverter<SyncStatus, int> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get serverTimestamp => $composableBuilder(
      column: $table.serverTimestamp, builder: (column) => column);

  GeneratedColumn<String> get address =>
      $composableBuilder(column: $table.address, builder: (column) => column);

  GeneratedColumn<String> get socialLinks => $composableBuilder(
      column: $table.socialLinks, builder: (column) => column);

  GeneratedColumn<String> get emergencyContact => $composableBuilder(
      column: $table.emergencyContact, builder: (column) => column);

  GeneratedColumn<String> get employmentInfo => $composableBuilder(
      column: $table.employmentInfo, builder: (column) => column);

  GeneratedColumn<String> get metadata =>
      $composableBuilder(column: $table.metadata, builder: (column) => column);

  GeneratedColumn<String> get referralCode => $composableBuilder(
      column: $table.referralCode, builder: (column) => column);

  GeneratedColumn<String> get referredBy => $composableBuilder(
      column: $table.referredBy, builder: (column) => column);

  GeneratedColumn<int> get referralCount => $composableBuilder(
      column: $table.referralCount, builder: (column) => column);

  GeneratedColumn<double> get trustScore => $composableBuilder(
      column: $table.trustScore, builder: (column) => column);

  GeneratedColumn<bool> get isVerified => $composableBuilder(
      column: $table.isVerified, builder: (column) => column);

  GeneratedColumn<bool> get isBusiness => $composableBuilder(
      column: $table.isBusiness, builder: (column) => column);

  GeneratedColumn<String> get businessInfo => $composableBuilder(
      column: $table.businessInfo, builder: (column) => column);
}

class $$UsersTableTableTableManager extends RootTableManager<
    _$AppDatabase,
    $UsersTableTable,
    UserEntity,
    $$UsersTableTableFilterComposer,
    $$UsersTableTableOrderingComposer,
    $$UsersTableTableAnnotationComposer,
    $$UsersTableTableCreateCompanionBuilder,
    $$UsersTableTableUpdateCompanionBuilder,
    (UserEntity, BaseReferences<_$AppDatabase, $UsersTableTable, UserEntity>),
    UserEntity,
    PrefetchHooks Function()> {
  $$UsersTableTableTableManager(_$AppDatabase db, $UsersTableTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$UsersTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$UsersTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$UsersTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> email = const Value.absent(),
            Value<String?> phoneNumber = const Value.absent(),
            Value<String?> displayName = const Value.absent(),
            Value<String?> firstName = const Value.absent(),
            Value<String?> lastName = const Value.absent(),
            Value<String?> username = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<String?> bio = const Value.absent(),
            Value<String?> dateOfBirth = const Value.absent(),
            Value<String?> countryCode = const Value.absent(),
            Value<String> language = const Value.absent(),
            Value<String?> timezone = const Value.absent(),
            Value<String> preferredCurrency = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String> accountType = const Value.absent(),
            Value<String> kycStatus = const Value.absent(),
            Value<int> kycLevel = const Value.absent(),
            Value<bool> biometricEnabled = const Value.absent(),
            Value<bool> twoFactorEnabled = const Value.absent(),
            Value<String?> notificationPreferences = const Value.absent(),
            Value<String?> privacySettings = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<int?> lastSeenAt = const Value.absent(),
            Value<bool> isOnline = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<String?> address = const Value.absent(),
            Value<String?> socialLinks = const Value.absent(),
            Value<String?> emergencyContact = const Value.absent(),
            Value<String?> employmentInfo = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<String?> referralCode = const Value.absent(),
            Value<String?> referredBy = const Value.absent(),
            Value<int> referralCount = const Value.absent(),
            Value<double?> trustScore = const Value.absent(),
            Value<bool> isVerified = const Value.absent(),
            Value<bool> isBusiness = const Value.absent(),
            Value<String?> businessInfo = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              UsersTableCompanion(
            id: id,
            email: email,
            phoneNumber: phoneNumber,
            displayName: displayName,
            firstName: firstName,
            lastName: lastName,
            username: username,
            avatarUrl: avatarUrl,
            bio: bio,
            dateOfBirth: dateOfBirth,
            countryCode: countryCode,
            language: language,
            timezone: timezone,
            preferredCurrency: preferredCurrency,
            status: status,
            accountType: accountType,
            kycStatus: kycStatus,
            kycLevel: kycLevel,
            biometricEnabled: biometricEnabled,
            twoFactorEnabled: twoFactorEnabled,
            notificationPreferences: notificationPreferences,
            privacySettings: privacySettings,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSeenAt: lastSeenAt,
            isOnline: isOnline,
            syncStatus: syncStatus,
            serverTimestamp: serverTimestamp,
            address: address,
            socialLinks: socialLinks,
            emergencyContact: emergencyContact,
            employmentInfo: employmentInfo,
            metadata: metadata,
            referralCode: referralCode,
            referredBy: referredBy,
            referralCount: referralCount,
            trustScore: trustScore,
            isVerified: isVerified,
            isBusiness: isBusiness,
            businessInfo: businessInfo,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> email = const Value.absent(),
            Value<String?> phoneNumber = const Value.absent(),
            Value<String?> displayName = const Value.absent(),
            Value<String?> firstName = const Value.absent(),
            Value<String?> lastName = const Value.absent(),
            Value<String?> username = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<String?> bio = const Value.absent(),
            Value<String?> dateOfBirth = const Value.absent(),
            Value<String?> countryCode = const Value.absent(),
            Value<String> language = const Value.absent(),
            Value<String?> timezone = const Value.absent(),
            Value<String> preferredCurrency = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String> accountType = const Value.absent(),
            Value<String> kycStatus = const Value.absent(),
            Value<int> kycLevel = const Value.absent(),
            Value<bool> biometricEnabled = const Value.absent(),
            Value<bool> twoFactorEnabled = const Value.absent(),
            Value<String?> notificationPreferences = const Value.absent(),
            Value<String?> privacySettings = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<int?> lastSeenAt = const Value.absent(),
            Value<bool> isOnline = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int?> serverTimestamp = const Value.absent(),
            Value<String?> address = const Value.absent(),
            Value<String?> socialLinks = const Value.absent(),
            Value<String?> emergencyContact = const Value.absent(),
            Value<String?> employmentInfo = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<String?> referralCode = const Value.absent(),
            Value<String?> referredBy = const Value.absent(),
            Value<int> referralCount = const Value.absent(),
            Value<double?> trustScore = const Value.absent(),
            Value<bool> isVerified = const Value.absent(),
            Value<bool> isBusiness = const Value.absent(),
            Value<String?> businessInfo = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              UsersTableCompanion.insert(
            id: id,
            email: email,
            phoneNumber: phoneNumber,
            displayName: displayName,
            firstName: firstName,
            lastName: lastName,
            username: username,
            avatarUrl: avatarUrl,
            bio: bio,
            dateOfBirth: dateOfBirth,
            countryCode: countryCode,
            language: language,
            timezone: timezone,
            preferredCurrency: preferredCurrency,
            status: status,
            accountType: accountType,
            kycStatus: kycStatus,
            kycLevel: kycLevel,
            biometricEnabled: biometricEnabled,
            twoFactorEnabled: twoFactorEnabled,
            notificationPreferences: notificationPreferences,
            privacySettings: privacySettings,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSeenAt: lastSeenAt,
            isOnline: isOnline,
            syncStatus: syncStatus,
            serverTimestamp: serverTimestamp,
            address: address,
            socialLinks: socialLinks,
            emergencyContact: emergencyContact,
            employmentInfo: employmentInfo,
            metadata: metadata,
            referralCode: referralCode,
            referredBy: referredBy,
            referralCount: referralCount,
            trustScore: trustScore,
            isVerified: isVerified,
            isBusiness: isBusiness,
            businessInfo: businessInfo,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$UsersTableTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $UsersTableTable,
    UserEntity,
    $$UsersTableTableFilterComposer,
    $$UsersTableTableOrderingComposer,
    $$UsersTableTableAnnotationComposer,
    $$UsersTableTableCreateCompanionBuilder,
    $$UsersTableTableUpdateCompanionBuilder,
    (UserEntity, BaseReferences<_$AppDatabase, $UsersTableTable, UserEntity>),
    UserEntity,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$TransactionsTableTableTableManager get transactionsTable =>
      $$TransactionsTableTableTableManager(_db, _db.transactionsTable);
  $$BalancesTableTableTableManager get balancesTable =>
      $$BalancesTableTableTableManager(_db, _db.balancesTable);
  $$MessagesTableTableTableManager get messagesTable =>
      $$MessagesTableTableTableManager(_db, _db.messagesTable);
  $$InteractionsTableTableTableManager get interactionsTable =>
      $$InteractionsTableTableTableManager(_db, _db.interactionsTable);
  $$UsersTableTableTableManager get usersTable =>
      $$UsersTableTableTableManager(_db, _db.usersTable);
}
