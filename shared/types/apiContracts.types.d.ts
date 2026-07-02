export type ArtifactFormat = 'PDF' | 'DOCX' | 'MARKDOWN' | 'TXT' | 'PY' | 'JS' | 'TS' | 'JAVA' | 'CS' | 'GO' | 'RUST' | 'JSON' | 'YAML';
export type ArtifactStatus = 'uploaded' | 'validating' | 'processing' | 'completed' | 'failed' | 'deleted';
export type ExtractionStatus = 'processing' | 'completed' | 'failed' | 'needs_review' | 'reviewed' | 'exported' | 'archived';
export type FieldType = 'data_categories' | 'legal_basis' | 'retention_period' | 'processing_purpose' | 'third_party_sharing' | 'data_subject_rights' | 'storage_method' | 'encryption_status';
export type FlagReason = 'low_confidence' | 'ambiguous' | 'conflicting' | 'needs_verification' | 'manual_flag';
export type AuditAction = 'uploaded' | 'extraction_started' | 'extraction_completed' | 'extraction_failed' | 'field_reviewed' | 'field_overridden' | 'result_exported' | 'result_archived' | 'artifact_deleted' | 'confidence_calibrated';
export interface ArtifactDTO {
    id: string;
    filename: string;
    format: ArtifactFormat;
    size_bytes: number;
    upload_timestamp: string;
    uploaded_by: string;
    content_hash: string;
    storage_path: string;
    status: ArtifactStatus;
    error_message?: string;
    extraction_model_version?: string;
    deleted_at?: string;
    created_at: string;
    updated_at: string;
}
export interface ExtractionResultDTO {
    id: string;
    artifact_id: string;
    artifact_filename?: string;
    extraction_timestamp: string;
    extraction_version: string;
    extracted_by: string;
    overall_confidence: number;
    flagged_count: number;
    human_override_count: number;
    completion_status: ExtractionStatus;
    extraction_duration_ms?: number;
    processing_notes?: string;
    extracted_fields: ExtractedFieldDTO[];
}
export interface ExtractedFieldDTO {
    field_id: string;
    field_type: FieldType;
    extracted_value: string;
    confidence_score: number;
    confidence_calibrated?: boolean;
    source_evidence: string;
    source_line_number?: number;
    is_flagged: boolean;
    flag_reason?: FlagReason;
    requires_human_review: boolean;
    human_override?: HumanOverrideDTO;
    metadata?: Record<string, unknown>;
}
export interface HumanOverrideDTO {
    override_value: string;
    override_confidence?: number;
    override_by: string;
    override_timestamp: string;
    rationale: string;
}
export interface UploadSessionDTO {
    upload_session_id: string;
    batch_id?: string;
    files: UploadFileStatusDTO[];
    total_files: number;
    total_size_bytes: number;
    estimated_total_time_seconds?: number;
    overall_progress_percent?: number;
    overall_status?: string;
    completed_at?: string;
    completed_files?: number;
    failed_files?: number;
    total_upload_time_ms?: number;
    next_step?: string;
}
export interface UploadFileStatusDTO {
    artifact_id: string;
    filename: string;
    format: ArtifactFormat;
    status: string;
    progress_percent: number;
    size_bytes?: number;
    bytes_uploaded?: number;
    total_bytes?: number;
    upload_time_ms?: number;
    content_hash?: string;
    validation_status?: string;
    error?: string;
    error_message?: string;
    estimated_upload_time_seconds?: number;
}
export interface FlaggedFieldDTO {
    field_id: string;
    field_type: FieldType;
    extracted_value: string;
    confidence_score: number;
    flag_reason: FlagReason;
    source_evidence: string;
    suggested_action?: string;
    lgpd_reference?: string[];
    human_override_available: boolean;
}
export interface OverrideRequest {
    field_id: string;
    override_value: string;
    rationale: string;
    override_type: 'correction' | 'confirmation';
}
export interface OverrideResponse {
    field_id: string;
    extraction_id: string;
    original_value: string;
    original_confidence: number;
    overridden_value: string;
    overridden_confidence: number;
    override_by: string;
    override_timestamp: string;
    rationale: string;
    override_status: string;
    is_flagged: boolean;
}
export interface ExportRequest {
    extraction_ids: string[];
    include_flagged?: boolean;
    include_overrides?: boolean;
    include_audit_trail?: boolean;
    format_version?: string;
}
export interface ExportResponse {
    export_id: string;
    exported_at: string;
    format_version: string;
    exported_extractions_count: number;
    schema_url?: string;
    extractions: ExportExtractionDTO[];
}
export interface ExportExtractionDTO {
    extraction_id: string;
    artifact: {
        id: string;
        filename: string;
        format: ArtifactFormat;
        upload_timestamp: string;
    };
    extraction_metadata: {
        extraction_timestamp: string;
        extraction_version: string;
        extracted_by: string;
        extraction_duration_ms?: number;
    };
    summary: {
        overall_confidence: number;
        flagged_count: number;
        human_override_count: number;
        completion_status: ExtractionStatus;
    };
    extracted_fields: ExportFieldDTO[];
}
export interface ExportFieldDTO {
    field_type: FieldType;
    extracted_value: string;
    confidence_score: number;
    is_flagged: boolean;
    source_evidence: string;
    human_override: HumanOverrideDTO | null;
}
export interface PaginatedResponse<T> {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    data: T[];
    next_page?: string;
}
export interface ApiError {
    error: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    request_id: string;
}
export type ViolationType = 'missing_legal_basis' | 'missing_retention_period' | 'missing_data_subject_rights' | 'insufficient_security' | 'unsafe_third_party_sharing' | 'sensitive_data_without_consent' | 'missing_dpo_contact' | 'unsafe_international_transfer' | 'missing_processing_purpose' | 'invalid_consent' | 'invalid_legitimate_interest' | 'missing_deletion_mechanism' | 'missing_governance_program' | 'missing_impact_report' | 'missing_incident_communication' | 'missing_privacy_by_design';
export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ViolationCategory = 'omission' | 'explicit';
export type RemediationStatus = 'active' | 'acknowledged' | 'in_progress' | 'resolved';
export type ComplianceStatus = 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' | 'INSUFFICIENT_DATA';
export interface ComplianceViolationDTO {
    id: string;
    extraction_result_id: string;
    violation_type: ViolationType;
    lgpd_article: string;
    severity: ViolationSeverity;
    violation_category: ViolationCategory;
    affected_field_type: string | null;
    extracted_value: string | null;
    remediation_guidance: string;
    remediation_status: RemediationStatus;
    remediation_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface ComplianceReportDTO {
    id: string;
    extraction_result_id: string;
    compliance_score: number;
    compliance_status: ComplianceStatus;
    total_violations: number;
    violations_by_severity: Record<string, number>;
    articles_checked: string[];
    violations: ComplianceViolationDTO[];
    previous_report_id: string | null;
    created_at: string;
    updated_at: string;
}
export interface UpdateViolationRequest {
    remediation_status: RemediationStatus;
    remediation_notes?: string;
}
export interface UpdateViolationResponse {
    id: string;
    remediation_status: RemediationStatus;
    remediation_notes: string | null;
    reviewed_by: string;
    reviewed_at: string;
}
export interface HealthCheckResponse {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    version: string;
    uptime: number;
}
//# sourceMappingURL=apiContracts.types.d.ts.map