FROM microsoft/dotnet:2.0-runtime AS base
WORKDIR /app

FROM microsoft/dotnet:2.0-sdk AS build
WORKDIR /src
COPY worker/worker.csproj worker/
RUN dotnet restore worker/worker.csproj
COPY . .
WORKDIR /src/worker
RUN dotnet build worker.csproj -c Release -o /app

FROM build AS publish
RUN dotnet publish worker.csproj -c Release -o /app

FROM base AS final
WORKDIR /app
COPY --from=publish /app .
ENV OBJECT_VERSION=v2
ENTRYPOINT ["dotnet", "worker.dll"]
