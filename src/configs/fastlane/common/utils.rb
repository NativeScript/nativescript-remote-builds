def snakeUpperCase (string)
  return string.gsub(/::/, '/').
    gsub(/([a-z])([A-Z\d])/,'\1_\2').
    gsub(/([A-Z])(\d)/,'\1_\2').
    gsub(/([\d])([A-Za-z])/,'\1_\2').
    tr("-", "_").
    tr(".", "_").
    upcase
end

def getCLIArgEnvName (argName)
  return "CLI_ARG_" + snakeUpperCase(argName) + "_{{CLI_BUILD_ID}}";
end

def getEnvVar (envVarName)
  result = 
      ENV[snakeUpperCase(envVarName) + "_{{CLI_BUILD_ID}}"] ||
      ENV[snakeUpperCase(envVarName)];

  return result;
end

def promoteBuildEnvVarForCurrentProcess (envVarName)
  envVarName = snakeUpperCase(envVarName);
  buildLevelEnvValue = ENV[envVarName + "_{{CLI_BUILD_ID}}"];
  if buildLevelEnvValue && buildLevelEnvValue != ""
    ENV[envVarName] = buildLevelEnvValue;
  end
end

def getCLIArgsFromEnv (argNames)
  cliArgs = [];
  argNames.each do |argName|
    envVarName = getCLIArgEnvName(argName);
    envVarValue = ENV[envVarName];
    if envVarValue && envVarValue != ""
      if envVarValue == "true"
        cliArgs.push("--#{argName}");
      elsif envVarValue == "false"
        cliArgs.push("--no-#{argName}");
      else
        cliArgs.push("--#{argName}", "\"$#{envVarName}\"");
      end
    end
  end

  return cliArgs;
end