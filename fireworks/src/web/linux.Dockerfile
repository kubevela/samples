FROM microsoft/aspnetcore:2.0 AS base
WORKDIR /app
EXPOSE 8080

FROM microsoft/aspnetcore-build:2.0 AS build
WORKDIR /src
COPY web/web.csproj web/
RUN dotnet restore web/web.csproj
COPY . .
WORKDIR /src/web
RUN dotnet build web.csproj -c Release -o /app

FROM build AS publish
RUN dotnet publish web.csproj -c Release -o /app

FROM base AS final
WORKDIR /app
COPY --from=publish /app .
ENTRYPOINT ["dotnet", "web.dll"]
