# ============================================================================
# Kubernetes Deployment Instructions
# ============================================================================

## Prerequisites

1. **Kubernetes Cluster** (EKS, GKE, AKS, or local minikube)
2. **kubectl** configured to access your cluster
3. **Docker image** of the API pushed to a registry
4. **PostgreSQL database** (managed service or deployed in cluster)
5. **SSL/TLS certificates** (Let's Encrypt via cert-manager recommended)

## Setup Steps

### 1. Create Namespace
```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Create Secrets
**Important:** Never commit secrets to git. Use one of these methods:

#### Option A: Using kubectl
```bash
kubectl create secret generic haccp-api-secrets \
  --namespace=haccp-app \
  --from-literal=DATABASE_URL='postgresql://user:pass@host:5432/db' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --from-literal=STRIPE_API_KEY='sk_live_...' \
  --from-literal=STRIPE_WEBHOOK_SECRET='whsec_...' \
  --from-literal=SENTRY_DSN='https://...'

# GCP service account key (if using GCS)
kubectl create secret generic gcp-service-account-key \
  --namespace=haccp-app \
  --from-file=key.json=./gcp-service-account-key.json
```

#### Option B: Using Sealed Secrets (Recommended for GitOps)
```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Seal your secrets
kubeseal --format yaml < k8s/secret.yaml > k8s/sealed-secret.yaml
kubectl apply -f k8s/sealed-secret.yaml
```

#### Option C: Using External Secrets Operator
```bash
# Install external-secrets
helm install external-secrets external-secrets/external-secrets

# Configure SecretStore (AWS Secrets Manager, GCP Secret Manager, etc.)
# See: https://external-secrets.io/
```

### 3. Create ConfigMap
```bash
# Update k8s/configmap.yaml with your production URLs
kubectl apply -f k8s/configmap.yaml
```

### 4. Create ServiceAccount
```bash
kubectl apply -f k8s/serviceaccount.yaml
```

### 5. Create PersistentVolumeClaim
```bash
kubectl apply -f k8s/pvc.yaml
```

### 6. Deploy the Application
```bash
# Update deployment.yaml with your Docker image
# e.g., image: gcr.io/your-project/haccp-api:v1.0.0

kubectl apply -f k8s/deployment.yaml
```

### 7. Create Service
```bash
kubectl apply -f k8s/service.yaml
```

### 8. Create Ingress
```bash
# Install nginx-ingress-controller (if not already installed)
helm install nginx-ingress ingress-nginx/ingress-nginx

# Install cert-manager for automatic TLS (optional but recommended)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Apply ingress
kubectl apply -f k8s/ingress.yaml
```

### 9. Enable Autoscaling (Optional)
```bash
kubectl apply -f k8s/hpa.yaml
```

## Verify Deployment

### Check pod status
```bash
kubectl get pods -n haccp-app
kubectl logs -f deployment/haccp-api -n haccp-app
```

### Check service
```bash
kubectl get svc -n haccp-app
```

### Check ingress
```bash
kubectl get ingress -n haccp-app
```

### Test health endpoint
```bash
# Port-forward for testing
kubectl port-forward -n haccp-app svc/haccp-api-service 3000:80

# Test health
curl http://localhost:3000/health
```

## Rolling Updates

```bash
# Update image
kubectl set image deployment/haccp-api \
  -n haccp-app \
  api=your-registry/haccp-api:v1.1.0

# Check rollout status
kubectl rollout status deployment/haccp-api -n haccp-app

# Rollback if needed
kubectl rollout undo deployment/haccp-api -n haccp-app
```

## Database Migrations

Migrations are run automatically via init container on each deployment.
To run manually:

```bash
kubectl exec -it deployment/haccp-api -n haccp-app -- npx prisma migrate deploy
```

## Monitoring

### View logs
```bash
kubectl logs -f deployment/haccp-api -n haccp-app
```

### Get metrics
```bash
kubectl top pods -n haccp-app
kubectl top nodes
```

### Describe resources
```bash
kubectl describe deployment/haccp-api -n haccp-app
kubectl describe pod <pod-name> -n haccp-app
```

## Troubleshooting

### Pod not starting
```bash
kubectl describe pod <pod-name> -n haccp-app
kubectl logs <pod-name> -n haccp-app
```

### Database connection issues
```bash
# Test database connectivity from a debug pod
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -- \
  psql postgresql://user:pass@host:5432/db
```

### Check secrets
```bash
kubectl get secrets -n haccp-app
kubectl describe secret haccp-api-secrets -n haccp-app
```

## Cleanup

```bash
# Delete all resources
kubectl delete namespace haccp-app

# Or delete individually
kubectl delete -f k8s/
```

## Production Checklist

- [ ] Secrets properly configured (not in git)
- [ ] Database backups configured
- [ ] Monitoring setup (Prometheus, Grafana)
- [ ] Logging aggregation (ELK, Loki)
- [ ] Alerts configured (Alertmanager, PagerDuty)
- [ ] SSL/TLS certificates valid
- [ ] Resource limits set appropriately
- [ ] Autoscaling configured
- [ ] Network policies applied
- [ ] Pod security policies/standards enforced
- [ ] Disaster recovery plan documented
- [ ] CI/CD pipeline integrated

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NestJS Best Practices](https://docs.nestjs.com/)
- [12-Factor App](https://12factor.net/)
- [Kubernetes Production Best Practices](https://learnk8s.io/production-best-practices)
