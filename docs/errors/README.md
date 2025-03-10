# Error Handling Guide

## Common Errors

### Configuration Errors

1. **Missing Configuration File**
```
Error: Failed to load config: ENOENT: no such file or directory, open 'devflow.yaml'
```
**Solution**: Run `devflow init` to create a new configuration file, or ensure you're in the correct directory.

2. **Invalid Configuration**
```
Error: Missing project_name in config
```
**Solution**: Ensure your configuration file includes all required fields:
- project_name
- version
- At least one workflow

### Docker Errors

1. **Docker Not Running**
```
Error: Failed to connect to Docker daemon
```
**Solution**: 
- Start Docker Desktop
- Ensure Docker daemon is running (`docker info`)

2. **Port Conflicts**
```
Error: Port 5432 already in use
```
**Solution**:
- Use `devflow clean` to remove existing containers
- Change the port in your configuration
- Stop conflicting services

### Task Execution Errors

1. **Command Not Found**
```
Error: Command failed: npm test
/bin/sh: npm: command not found
```
**Solution**:
- Ensure required tools are installed
- Use absolute paths when necessary
- Check PATH environment variable

2. **Health Check Failures**
```
Error: Health check failed for container test-db after 5 retries
```
**Solution**:
- Increase retry count or interval in health check config
- Check container logs (`docker logs test-db`)
- Verify service configuration

## Best Practices

1. **Always Clean Up**
```bash
# After testing or when switching projects
devflow clean
```

2. **Use Debug Mode**
```bash
devflow test workflow --debug
```

3. **Environment Variables**
- Use .env.local for secrets (git ignored)
- Use configuration file for non-sensitive values
- Override with command line when needed

4. **Health Checks**
- Always add health checks for Docker services
- Use appropriate timeouts based on service startup time
- Include retry logic for dependent services

## Troubleshooting Steps

1. **General Issues**
   - Check DevFlow logs (--debug flag)
   - Verify configuration file
   - Ensure Docker is running
   - Clean up resources

2. **Docker Issues**
   - Check container logs
   - Verify network connectivity
   - Inspect container state
   - Check resource usage

3. **Task Issues**
   - Verify command exists
   - Check environment variables
   - Test command manually
   - Review task dependencies 